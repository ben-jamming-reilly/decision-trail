import { demoEntities, demoMeetings } from "@/lib/demo-data";
import type { Entity, EntitySummary } from "@/lib/domain";
import type {
  CapturePatch,
  KnowledgeRepository,
  MeetingCapture,
  TranscriptInput,
} from "@/lib/repository";
import { queryTerms, scoreSearchResult } from "@/lib/search";

function toSummary(entity: Entity): EntitySummary {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    kind: entity.kind,
    description: entity.description,
    claimCount: entity.claimCount,
    activeClaimCount: entity.activeClaimCount,
    updatedAt: entity.updatedAt,
  };
}

export class DemoKnowledgeRepository implements KnowledgeRepository {
  async getStats() {
    return {
      entities: demoEntities.length,
      meetings: demoMeetings.length,
      claims: demoEntities.reduce((sum, entity) => sum + entity.claimCount, 0),
      evidenceLinks: demoEntities.reduce(
        (sum, entity) =>
          sum +
          entity.claims.reduce(
            (claimSum, claim) => claimSum + claim.evidence.length,
            0,
          ),
        0,
      ),
    };
  }

  async listEntities() {
    return demoEntities.map((entity) => structuredClone(toSummary(entity)));
  }

  async getEntity(slug: string) {
    return structuredClone(
      demoEntities.find((entity) => entity.slug === slug) ?? null,
    );
  }

  async listMeetings() {
    return demoMeetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      startedAt: meeting.startedAt,
      participants: [...meeting.participants],
      source: meeting.source,
      recallBotId: meeting.recallBotId,
      utteranceCount: meeting.utteranceCount,
    }));
  }

  async getMeeting(id: string) {
    return structuredClone(
      demoMeetings.find((meeting) => meeting.id === id) ?? null,
    );
  }

  async search(query: string) {
    const terms = queryTerms(query);
    if (terms.length === 0) return [];

    return demoEntities
      .flatMap((entity) =>
        entity.claims.map((claim) => {
          const score = scoreSearchResult(terms, {
            claim: claim.text,
            entityName: entity.name,
            entityDescription: entity.description,
          });
          return { entity: toSummary(entity), claim, score };
        }),
      )
      .filter((result) => result.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.claim.recordedAt.localeCompare(a.claim.recordedAt),
      )
      .slice(0, 12);
  }

  async recordWebhook(): Promise<boolean> {
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to ingest webhooks",
    );
  }

  async completeWebhook() {
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to process webhooks",
    );
  }

  async createCapture(): Promise<MeetingCapture> {
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to create meeting bots",
    );
  }

  async getCaptureByBotId() {
    return null;
  }

  async getCapture() {
    return null;
  }

  async updateCapture(
    _id: string,
    _patch: CapturePatch,
  ): Promise<MeetingCapture | null> {
    void _id;
    void _patch;
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to update meeting bots",
    );
  }

  async saveTranscript(input: TranscriptInput): Promise<string> {
    void input;
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to ingest transcripts",
    );
  }

  async saveExtractedClaims(): Promise<number> {
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to save extracted claims",
    );
  }
}
