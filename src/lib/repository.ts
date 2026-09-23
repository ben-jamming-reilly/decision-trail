import type {
  Entity,
  EntitySummary,
  KnowledgeStats,
  Meeting,
  MeetingSummary,
  QueryResult,
  Utterance,
} from "@/lib/domain";

export interface TranscriptInput {
  recallTranscriptId: string;
  recallRecordingId?: string;
  recallBotId?: string;
  title: string;
  startedAt: string;
  utterances: Omit<Utterance, "id">[];
}

export interface KnowledgeRepository {
  getStats(): Promise<KnowledgeStats>;
  listEntities(): Promise<EntitySummary[]>;
  getEntity(slug: string): Promise<Entity | null>;
  listMeetings(): Promise<MeetingSummary[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  search(query: string): Promise<QueryResult[]>;
  hasWebhook(eventId: string): Promise<boolean>;
  recordWebhook(
    eventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<void>;
  saveTranscript(input: TranscriptInput): Promise<string>;
}
