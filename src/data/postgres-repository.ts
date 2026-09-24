import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "@/db";
import {
  claim,
  claimEvidence,
  claimTransition,
  entity,
  meeting,
  meetingCapture,
  utterance,
  webhookEvent,
} from "@/db/schema";
import type { Claim, Evidence, QueryResult } from "@/lib/domain";
import type {
  CapturePatch,
  ExtractedEntityInput,
  KnowledgeRepository,
  MeetingCapture,
  TranscriptInput,
} from "@/lib/repository";
import { queryTerms, scoreSearchResult } from "@/lib/search";

export class PostgresKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: Database) {}

  async getStats() {
    const [[entities], [meetings], [claims], [links]] = await Promise.all([
      this.db.select({ value: count() }).from(entity),
      this.db.select({ value: count() }).from(meeting),
      this.db.select({ value: count() }).from(claim),
      this.db.select({ value: count() }).from(claimEvidence),
    ]);
    return {
      entities: entities.value,
      meetings: meetings.value,
      claims: claims.value,
      evidenceLinks: links.value,
    };
  }

  async listEntities(trailId?: string) {
    const rows = await this.db
      .select({
        id: entity.id,
        slug: entity.slug,
        name: entity.name,
        kind: entity.kind,
        description: entity.description,
        claimCount: count(claim.id),
        activeClaimCount: sql<number>`count(${claim.id}) filter (where ${claim.state} = 'active')::int`,
        updatedAt: entity.updatedAt,
      })
      .from(entity)
      .leftJoin(claim, eq(claim.entityId, entity.id))
      .where(trailId ? eq(claim.trailId, trailId) : undefined)
      .groupBy(entity.id)
      .orderBy(desc(entity.updatedAt));
    return rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getEntity(slug: string, trailId?: string) {
    const [subject] = await this.db
      .select()
      .from(entity)
      .where(eq(entity.slug, slug));
    if (!subject) return null;
    const claims = await this.claimsForEntities([subject.id], trailId);
    const subjectClaims = claims.get(subject.id) ?? [];
    return {
      ...subject,
      claimCount: subjectClaims.length,
      activeClaimCount: subjectClaims.filter((item) => item.state === "active")
        .length,
      updatedAt: subject.updatedAt.toISOString(),
      claims: subjectClaims,
    };
  }

  async listMeetings() {
    const rows = await this.db
      .select({
        id: meeting.id,
        trailId: meeting.trailId,
        title: meeting.title,
        startedAt: meeting.startedAt,
        participants: meeting.participants,
        source: meeting.source,
        recallBotId: meeting.recallBotId,
        recallRecordingId: meeting.recallRecordingId,
        utteranceCount: count(utterance.id),
      })
      .from(meeting)
      .leftJoin(utterance, eq(utterance.meetingId, meeting.id))
      .groupBy(meeting.id)
      .orderBy(desc(meeting.startedAt));
    return rows.map((row) => ({
      ...row,
      source: "recall" as const,
      startedAt: row.startedAt.toISOString(),
      recallBotId: row.recallBotId ?? undefined,
      recallRecordingId: row.recallRecordingId ?? undefined,
    }));
  }

  async listCaptures() {
    const rows = await this.db
      .select()
      .from(meetingCapture)
      .orderBy(desc(meetingCapture.updatedAt));
    return rows.map(toCapture);
  }

  async getMeeting(id: string) {
    const [row] = await this.db
      .select()
      .from(meeting)
      .where(eq(meeting.id, id));
    if (!row) return null;
    const utterances = await this.db
      .select()
      .from(utterance)
      .where(eq(utterance.meetingId, id))
      .orderBy(asc(utterance.ordinal));
    return {
      id: row.id,
      trailId: row.trailId,
      title: row.title,
      startedAt: row.startedAt.toISOString(),
      participants: row.participants,
      source: "recall" as const,
      recallBotId: row.recallBotId ?? undefined,
      recallRecordingId: row.recallRecordingId ?? undefined,
      utteranceCount: utterances.length,
      utterances: utterances.map((item) => ({
        id: item.id,
        speaker: item.speaker,
        speakerIdentity: item.speakerIdentity ?? undefined,
        speakerEmail: item.speakerEmail ?? undefined,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        text: item.text,
      })),
    };
  }

  async listMeetingChanges(meetingId: string) {
    const rows = await this.db
      .selectDistinct({ entity, claim })
      .from(claim)
      .innerJoin(entity, eq(entity.id, claim.entityId))
      .innerJoin(claimEvidence, eq(claimEvidence.claimId, claim.id))
      .innerJoin(utterance, eq(utterance.id, claimEvidence.utteranceId))
      .where(eq(utterance.meetingId, meetingId))
      .orderBy(desc(claim.recordedAt));
    const hydrated = await this.claimsForEntities([
      ...new Set(rows.map((row) => row.entity.id)),
    ]);
    return rows.flatMap(({ entity: subject, claim: rawClaim }) => {
      const claims = hydrated.get(subject.id) ?? [];
      const hydratedClaim = claims.find((item) => item.id === rawClaim.id);
      if (!hydratedClaim) return [];
      return [
        {
          entity: {
            id: subject.id,
            slug: subject.slug,
            name: subject.name,
            kind: subject.kind,
            description: subject.description,
            claimCount: claims.length,
            activeClaimCount: claims.filter((item) => item.state === "active")
              .length,
            updatedAt: subject.updatedAt.toISOString(),
          },
          claim: hydratedClaim,
          previousClaim: hydratedClaim.supersedesClaimId
            ? claims.find((item) => item.id === hydratedClaim.supersedesClaimId)
            : undefined,
        },
      ];
    });
  }

  async search(query: string): Promise<QueryResult[]> {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    const matchingClaims = await this.db
      .select({ entity, claim })
      .from(claim)
      .innerJoin(entity, eq(claim.entityId, entity.id))
      .where(
        or(
          ...terms.flatMap((term) => {
            const pattern = `%${term}%`;
            return [
              ilike(claim.text, pattern),
              ilike(entity.name, pattern),
              ilike(entity.description, pattern),
            ];
          }),
        ),
      )
      .limit(12);
    const entityIds = [
      ...new Set(matchingClaims.map((item) => item.entity.id)),
    ];
    const hydrated = await this.claimsForEntities(entityIds);
    return matchingClaims
      .flatMap(({ entity: item, claim: rawClaim }) => {
        const claims = hydrated.get(item.id) ?? [];
        const hydratedClaim = claims.find((value) => value.id === rawClaim.id);
        if (!hydratedClaim) return [];
        return [
          {
            entity: {
              ...item,
              updatedAt: item.updatedAt.toISOString(),
              claimCount: claims.length,
              activeClaimCount: claims.filter(
                (value) => value.state === "active",
              ).length,
            },
            claim: hydratedClaim,
            score: scoreSearchResult(terms, {
              claim: rawClaim.text,
              entityName: item.name,
              entityDescription: item.description,
            }),
          },
        ];
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.claim.recordedAt.localeCompare(a.claim.recordedAt),
      );
  }

  async recordWebhook(eventId: string, eventType: string, payload: unknown) {
    const rows = await this.db
      .insert(webhookEvent)
      .values({ id: eventId, eventType, payload })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });
    return rows.length > 0;
  }

  async completeWebhook(eventId: string, error?: string) {
    await this.db
      .update(webhookEvent)
      .set({ processedAt: new Date(), error: error ?? null })
      .where(eq(webhookEvent.id, eventId));
  }

  async createCapture(input: {
    trailId: string;
    title: string;
    meetingUrl: string;
    joinAt: string;
  }) {
    const [row] = await this.db
      .insert(meetingCapture)
      .values({
        trailId: input.trailId,
        title: input.title,
        meetingUrl: input.meetingUrl,
        joinAt: new Date(input.joinAt),
      })
      .returning();
    return toCapture(row);
  }

  async getTrailVocabulary(trailId: string) {
    const [subjects, speakers] = await Promise.all([
      this.db
        .selectDistinct({ name: entity.name, aliases: entity.aliases })
        .from(entity)
        .innerJoin(claim, eq(claim.entityId, entity.id))
        .where(eq(claim.trailId, trailId)),
      this.db
        .select({ speaker: utterance.speaker })
        .from(utterance)
        .innerJoin(meeting, eq(meeting.id, utterance.meetingId))
        .where(eq(meeting.trailId, trailId)),
    ]);
    return [
      ...new Set(
        [
          ...subjects.flatMap((item) => [item.name, ...item.aliases]),
          ...speakers.map((item) => item.speaker),
        ]
          .map((item) => item.trim())
          .filter((item) => item.length >= 2 && item.length <= 100),
      ),
    ].slice(0, 100);
  }

  async getCapture(id: string) {
    const [row] = await this.db
      .select()
      .from(meetingCapture)
      .where(eq(meetingCapture.id, id));
    return row ? toCapture(row) : null;
  }

  async getCaptureByBotId(botId: string) {
    const [row] = await this.db
      .select()
      .from(meetingCapture)
      .where(eq(meetingCapture.botId, botId));
    return row ? toCapture(row) : null;
  }

  async getCaptureByMeetingId(meetingId: string) {
    const [row] = await this.db
      .select()
      .from(meetingCapture)
      .where(eq(meetingCapture.meetingId, meetingId));
    return row ? toCapture(row) : null;
  }

  async updateCapture(id: string, patch: CapturePatch) {
    const [row] = await this.db
      .update(meetingCapture)
      .set({
        ...(patch.botId !== undefined ? { botId: patch.botId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.statusDetail !== undefined
          ? { statusDetail: patch.statusDetail }
          : {}),
        ...(patch.lastBotEventAt !== undefined
          ? { lastBotEventAt: new Date(patch.lastBotEventAt) }
          : {}),
        ...(patch.recordingId !== undefined
          ? { recordingId: patch.recordingId }
          : {}),
        ...(patch.transcriptId !== undefined
          ? { transcriptId: patch.transcriptId }
          : {}),
        ...(patch.meetingId !== undefined
          ? { meetingId: patch.meetingId }
          : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
        updatedAt: new Date(),
      })
      .where(eq(meetingCapture.id, id))
      .returning();
    return row ? toCapture(row) : null;
  }

  async saveTranscript(input: TranscriptInput) {
    return this.db.transaction(async (tx) => {
      const participants = [
        ...new Set(input.utterances.map((item) => item.speaker)),
      ];
      const [saved] = await tx
        .insert(meeting)
        .values({
          trailId: input.trailId,
          title: input.title,
          startedAt: new Date(input.startedAt),
          recallTranscriptId: input.recallTranscriptId,
          recallRecordingId: input.recallRecordingId,
          recallBotId: input.recallBotId,
          participants,
        })
        .onConflictDoUpdate({
          target: meeting.recallTranscriptId,
          set: { trailId: input.trailId, title: input.title, participants },
        })
        .returning({ id: meeting.id });
      if (input.utterances.length) {
        for (const [ordinal, item] of input.utterances.entries()) {
          await tx
            .insert(utterance)
            .values({ ...item, meetingId: saved.id, ordinal })
            .onConflictDoUpdate({
              target: [utterance.meetingId, utterance.ordinal],
              set: {
                speaker: item.speaker,
                speakerIdentity: item.speakerIdentity,
                speakerEmail: item.speakerEmail,
                startSeconds: item.startSeconds,
                endSeconds: item.endSeconds,
                text: item.text,
              },
            });
        }
      }
      return saved.id;
    });
  }

  async saveExtractedClaims(
    meetingId: string,
    extractedEntities: ExtractedEntityInput[],
  ) {
    return this.db.transaction(async (tx) => {
      const [sourceMeeting] = await tx
        .select({ startedAt: meeting.startedAt, trailId: meeting.trailId })
        .from(meeting)
        .where(eq(meeting.id, meetingId));
      if (!sourceMeeting) throw new Error(`Meeting ${meetingId} was not found`);

      const meetingUtterances = await tx
        .select({ id: utterance.id })
        .from(utterance)
        .where(eq(utterance.meetingId, meetingId));
      const validEvidence = new Set(meetingUtterances.map((item) => item.id));
      let insertedClaims = 0;

      for (const extractedEntity of extractedEntities) {
        const [subject] = await tx
          .insert(entity)
          .values({
            slug: extractedEntity.slug,
            name: extractedEntity.name,
            kind: extractedEntity.kind,
            description: extractedEntity.description,
            aliases: extractedEntity.aliases,
            updatedAt: sourceMeeting.startedAt,
          })
          .onConflictDoUpdate({
            target: entity.slug,
            set: {
              name: extractedEntity.name,
              kind: extractedEntity.kind,
              description: extractedEntity.description,
              aliases: extractedEntity.aliases,
              updatedAt: sourceMeeting.startedAt,
            },
          })
          .returning({ id: entity.id });

        for (const extractedClaim of extractedEntity.claims) {
          const evidenceIds = extractedClaim.evidenceUtteranceIds.filter((id) =>
            validEvidence.has(id),
          );
          if (!evidenceIds.length) continue;

          const relatedClaimId = extractedClaim.relatedClaimId;
          const [relatedClaim] = relatedClaimId
            ? await tx
                .select({ id: claim.id, state: claim.state })
                .from(claim)
                .where(
                  and(
                    eq(claim.id, relatedClaimId),
                    eq(claim.entityId, subject.id),
                    eq(claim.trailId, sourceMeeting.trailId),
                  ),
                )
            : [];
          const relationship = relatedClaim
            ? extractedClaim.relationship
            : "new";

          if (
            relatedClaim &&
            (relationship === "reaffirms" || relationship === "resolves")
          ) {
            await tx
              .insert(claimEvidence)
              .values(
                evidenceIds.map((utteranceId) => ({
                  claimId: relatedClaim.id,
                  utteranceId,
                })),
              )
              .onConflictDoNothing();
            const nextState =
              relationship === "resolves" ? "resolved" : relatedClaim.state;
            if (relationship === "resolves") {
              await tx
                .update(claim)
                .set({ state: nextState })
                .where(eq(claim.id, relatedClaim.id));
            }
            await tx.insert(claimTransition).values({
              claimId: relatedClaim.id,
              fromState: relatedClaim.state,
              toState: nextState,
              reason:
                relationship === "resolves"
                  ? "Resolved by cited meeting evidence"
                  : "Reaffirmed by cited meeting evidence",
              meetingId,
              changedAt: sourceMeeting.startedAt,
            });
            continue;
          }

          const [duplicate] = await tx
            .select({ id: claim.id })
            .from(claim)
            .where(
              and(
                eq(claim.entityId, subject.id),
                eq(claim.trailId, sourceMeeting.trailId),
                eq(claim.text, extractedClaim.text),
              ),
            );
          if (duplicate) {
            await tx
              .insert(claimEvidence)
              .values(
                evidenceIds.map((utteranceId) => ({
                  claimId: duplicate.id,
                  utteranceId,
                })),
              )
              .onConflictDoNothing();
            continue;
          }
          const [savedClaim] = await tx
            .insert(claim)
            .values({
              trailId: sourceMeeting.trailId,
              entityId: subject.id,
              text: extractedClaim.text,
              state: relationship === "disputes" ? "disputed" : "active",
              confidence: extractedClaim.confidence,
              supersedesClaimId:
                relationship === "supersedes" ? relatedClaim?.id : undefined,
              templateId: "neutral-v1",
              recordedAt: sourceMeeting.startedAt,
            })
            .returning({ id: claim.id, state: claim.state });
          await tx.insert(claimEvidence).values(
            evidenceIds.map((utteranceId) => ({
              claimId: savedClaim.id,
              utteranceId,
            })),
          );
          await tx.insert(claimTransition).values({
            claimId: savedClaim.id,
            toState: savedClaim.state,
            reason: "Extracted from cited meeting evidence by AI",
            meetingId,
            changedAt: sourceMeeting.startedAt,
          });

          if (relationship === "supersedes" && relatedClaim) {
            await tx
              .update(claim)
              .set({ state: "superseded" })
              .where(eq(claim.id, relatedClaim.id));
            if (relatedClaim.state !== "superseded") {
              await tx.insert(claimTransition).values({
                claimId: relatedClaim.id,
                fromState: relatedClaim.state,
                toState: "superseded",
                reason: `Superseded by claim ${savedClaim.id}`,
                meetingId,
                changedAt: sourceMeeting.startedAt,
              });
            }
          }
          insertedClaims += 1;
        }
      }
      return insertedClaims;
    });
  }

  private async claimsForEntities(entityIds: string[], trailId?: string) {
    const result = new Map<string, Claim[]>();
    if (!entityIds.length) return result;
    const rows = await this.db
      .select({
        claim,
        evidenceId: claimEvidence.utteranceId,
        utterance,
        meeting,
      })
      .from(claim)
      .leftJoin(claimEvidence, eq(claimEvidence.claimId, claim.id))
      .leftJoin(utterance, eq(utterance.id, claimEvidence.utteranceId))
      .leftJoin(meeting, eq(meeting.id, utterance.meetingId))
      .where(
        trailId
          ? and(inArray(claim.entityId, entityIds), eq(claim.trailId, trailId))
          : inArray(claim.entityId, entityIds),
      )
      .orderBy(desc(claim.recordedAt));
    for (const row of rows) {
      let item = result
        .get(row.claim.entityId)
        ?.find((value) => value.id === row.claim.id);
      if (!item) {
        item = {
          id: row.claim.id,
          text: row.claim.text,
          state: row.claim.state,
          confidence: row.claim.confidence,
          recordedAt: row.claim.recordedAt.toISOString(),
          supersedesClaimId: row.claim.supersedesClaimId ?? undefined,
          evidence: [],
        };
        result.set(row.claim.entityId, [
          ...(result.get(row.claim.entityId) ?? []),
          item,
        ]);
      }
      if (row.evidenceId && row.utterance && row.meeting) {
        const evidence: Evidence = {
          id: row.evidenceId,
          meetingId: row.meeting.id,
          meetingTitle: row.meeting.title,
          meetingDate: row.meeting.startedAt.toISOString(),
          speaker: row.utterance.speaker,
          startSeconds: row.utterance.startSeconds,
          endSeconds: row.utterance.endSeconds,
          quote: row.utterance.text,
        };
        item.evidence.push(evidence);
      }
    }
    return result;
  }
}

function toCapture(row: typeof meetingCapture.$inferSelect): MeetingCapture {
  return {
    id: row.id,
    trailId: row.trailId,
    title: row.title,
    meetingUrl: row.meetingUrl,
    joinAt: row.joinAt.toISOString(),
    botId: row.botId ?? undefined,
    status: row.status,
    statusDetail: row.statusDetail ?? undefined,
    lastBotEventAt: row.lastBotEventAt?.toISOString(),
    recordingId: row.recordingId ?? undefined,
    transcriptId: row.transcriptId ?? undefined,
    meetingId: row.meetingId ?? undefined,
    error: row.error ?? undefined,
  };
}
