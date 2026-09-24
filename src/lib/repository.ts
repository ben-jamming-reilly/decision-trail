import type {
  Entity,
  EntitySummary,
  KnowledgeStats,
  Meeting,
  MeetingChange,
  MeetingSummary,
  QueryResult,
  Utterance,
} from "@/lib/domain";

export interface TranscriptInput {
  trailId: string;
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
  trailId: string;
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

export type ExtractedClaimRelationship =
  "new" | "reaffirms" | "supersedes" | "disputes" | "resolves";

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
  listEntities(trailId?: string): Promise<EntitySummary[]>;
  getEntity(slug: string, trailId?: string): Promise<Entity | null>;
  listMeetings(): Promise<MeetingSummary[]>;
  listCaptures(): Promise<MeetingCapture[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  listMeetingChanges(meetingId: string): Promise<MeetingChange[]>;
  search(query: string): Promise<QueryResult[]>;
  recordWebhook(
    eventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<boolean>;
  completeWebhook(eventId: string, error?: string): Promise<void>;
  createCapture(input: {
    trailId: string;
    title: string;
    meetingUrl: string;
    joinAt: string;
  }): Promise<MeetingCapture>;
  getTrailVocabulary(trailId: string): Promise<string[]>;
  getCaptureByBotId(botId: string): Promise<MeetingCapture | null>;
  getCaptureByMeetingId(meetingId: string): Promise<MeetingCapture | null>;
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
