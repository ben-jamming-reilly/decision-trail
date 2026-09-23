import { demoEntities, demoMeetings } from "@/lib/demo-data";
import type { Entity, EntitySummary } from "@/lib/domain";
import type { KnowledgeRepository, TranscriptInput } from "@/lib/repository";
import { queryTerms } from "@/lib/search";

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
          const searchable =
            `${entity.name} ${entity.description} ${claim.text}`.toLowerCase();
          const score = terms.filter((term) =>
            searchable.includes(term),
          ).length;
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

  async hasWebhook() {
    return false;
  }

  async recordWebhook() {
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to ingest webhooks",
    );
  }

  async saveTranscript(input: TranscriptInput): Promise<string> {
    void input;
    throw new Error(
      "Demo mode is read-only; configure DATABASE_URL to ingest transcripts",
    );
  }
}
