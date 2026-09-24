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

export interface RecallTranscriptArtifact {
  id: string;
  data: { download_url: string };
  metadata?: Record<string, unknown>;
}

export interface RecallRecording {
  id: string;
  status?: { code?: string };
  media_shortcuts?: {
    transcript?:
      (RecallTranscriptArtifact & { status?: { code?: string } }) | null;
  };
}

export interface RecallBot {
  id: string;
  metadata?: Record<string, unknown>;
  status_changes?: Array<{
    code: string;
    sub_code?: string | null;
    created_at: string;
  }>;
  recordings?: RecallRecording[];
}
