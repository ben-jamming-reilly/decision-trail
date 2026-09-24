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

export type CaptureStatus =
  | "scheduled"
  | "joining"
  | "waiting_room"
  | "in_call"
  | "recording"
  | "processing"
  | "ready"
  | "failed";

export interface MeetingCapture {
  id: string;
  title: string;
  meetingUrl: string;
  joinAt: string;
  botId?: string;
  status: CaptureStatus;
  statusDetail?: string;
  lastBotEventAt?: string;
  recordingId?: string;
  transcriptId?: string;
  meetingId?: string;
  error?: string;
}

export interface CapturePatch {
  botId?: string;
  status?: CaptureStatus;
  statusDetail?: string | null;
  lastBotEventAt?: string;
  recordingId?: string;
  transcriptId?: string;
  meetingId?: string;
  error?: string | null;
}

export type ExtractedClaimRelationship = "new" | "supersedes" | "disputes";

export interface ExtractedEntityInput {
  slug: string;
  name: string;
  kind: string;
  description: string;
  aliases: string[];
  claims: Array<{
    text: string;
    confidence: number;
    evidenceUtteranceIds: string[];
    relationship: ExtractedClaimRelationship;
    relatedClaimId?: string;
  }>;
}

export interface KnowledgeRepository {
  getStats(): Promise<KnowledgeStats>;
  listEntities(): Promise<EntitySummary[]>;
  getEntity(slug: string): Promise<Entity | null>;
  listMeetings(): Promise<MeetingSummary[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  search(query: string): Promise<QueryResult[]>;
  recordWebhook(
    eventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<boolean>;
  completeWebhook(eventId: string, error?: string): Promise<void>;
  createCapture(input: {
    title: string;
    meetingUrl: string;
    joinAt: string;
  }): Promise<MeetingCapture>;
  getCaptureByBotId(botId: string): Promise<MeetingCapture | null>;
  getCapture(id: string): Promise<MeetingCapture | null>;
  updateCapture(
    id: string,
    patch: CapturePatch,
  ): Promise<MeetingCapture | null>;
  saveTranscript(input: TranscriptInput): Promise<string>;
  saveExtractedClaims(
    meetingId: string,
    entities: ExtractedEntityInput[],
  ): Promise<number>;
}
