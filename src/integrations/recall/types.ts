export interface RecallWord {
  text: string;
  start_timestamp?: number | { relative?: number; absolute?: string };
  end_timestamp?: number | { relative?: number; absolute?: string };
  start_time?: number;
  end_time?: number;
  timestamp?: { relative?: number; absolute?: string };
}

export interface RecallTranscriptSegment {
  speaker?: string | null;
  participant?: { name?: string | null };
  words: RecallWord[];
}

export const RECALL_REGIONS = [
  "us-west-2",
  "us-east-1",
  "eu-central-1",
  "ap-northeast-1",
] as const;

export type RecallRegion = (typeof RECALL_REGIONS)[number];

export interface RecallTranscriptDoneEvent {
  event: "transcript.done";
  data: {
    transcript: { id: string };
    recording?: { id: string };
    bot?: { id: string };
  };
}

export interface RecallTranscriptArtifact {
  id: string;
  data: { download_url: string };
  metadata?: Record<string, unknown>;
}
