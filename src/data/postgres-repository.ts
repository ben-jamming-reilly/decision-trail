import { asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  claim,
  claimEvidence,
  entity,
  meeting,
  utterance,
  webhookEvent,
} from "@/db/schema";
import type { Claim, Evidence, QueryResult } from "@/lib/domain";
import type { KnowledgeRepository, TranscriptInput } from "@/lib/repository";
import { queryTerms } from "@/lib/search";

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

  async listEntities() {
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
      .groupBy(entity.id)
      .orderBy(desc(entity.updatedAt));
    return rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getEntity(slug: string) {
    const [subject] = await this.db
      .select()
      .from(entity)
      .where(eq(entity.slug, slug));
    if (!subject) return null;
    const claims = await this.claimsForEntities([subject.id]);
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
        title: meeting.title,
        startedAt: meeting.startedAt,
        participants: meeting.participants,
        source: meeting.source,
        recallBotId: meeting.recallBotId,
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
    }));
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
      title: row.title,
      startedAt: row.startedAt.toISOString(),
      participants: row.participants,
      source: "recall" as const,
      recallBotId: row.recallBotId ?? undefined,
      utteranceCount: utterances.length,
      utterances: utterances.map((item) => ({
        id: item.id,
        speaker: item.speaker,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        text: item.text,
      })),
    };
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
    return matchingClaims.flatMap(({ entity: item, claim: rawClaim }) => {
      const claims = hydrated.get(item.id) ?? [];
      const hydratedClaim = claims.find((value) => value.id === rawClaim.id);
      if (!hydratedClaim) return [];
      return [
        {
          entity: {
            ...item,
            updatedAt: item.updatedAt.toISOString(),
            claimCount: claims.length,
            activeClaimCount: claims.filter((value) => value.state === "active")
              .length,
          },
          claim: hydratedClaim,
          score: 1,
        },
      ];
    });
  }

  async hasWebhook(eventId: string) {
    const [row] = await this.db
      .select({ id: webhookEvent.id })
      .from(webhookEvent)
      .where(eq(webhookEvent.id, eventId));
    return Boolean(row);
  }

  async recordWebhook(eventId: string, eventType: string, payload: unknown) {
    await this.db.insert(webhookEvent).values({
      id: eventId,
      eventType,
      payload,
      processedAt: new Date(),
    });
  }

  async saveTranscript(input: TranscriptInput) {
    return this.db.transaction(async (tx) => {
      const participants = [
        ...new Set(input.utterances.map((item) => item.speaker)),
      ];
      const [saved] = await tx
        .insert(meeting)
        .values({
          title: input.title,
          startedAt: new Date(input.startedAt),
          recallTranscriptId: input.recallTranscriptId,
          recallRecordingId: input.recallRecordingId,
          recallBotId: input.recallBotId,
          participants,
        })
        .onConflictDoUpdate({
          target: meeting.recallTranscriptId,
          set: { title: input.title, participants },
        })
        .returning({ id: meeting.id });
      await tx.delete(utterance).where(eq(utterance.meetingId, saved.id));
      if (input.utterances.length) {
        await tx.insert(utterance).values(
          input.utterances.map((item, ordinal) => ({
            ...item,
            meetingId: saved.id,
            ordinal,
          })),
        );
      }
      return saved.id;
    });
  }

  private async claimsForEntities(entityIds: string[]) {
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
      .where(inArray(claim.entityId, entityIds))
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
