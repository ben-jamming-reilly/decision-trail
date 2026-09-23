import type {
  RecallRegion,
  RecallTranscriptArtifact,
  RecallTranscriptSegment,
} from "@/integrations/recall/types";
import { RECALL_REGIONS } from "@/integrations/recall/types";
import type { TranscriptInput } from "@/lib/repository";

export class RecallClient {
  constructor(
    private readonly apiKey: string,
    private readonly region: string = "us-west-2",
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!RECALL_REGIONS.includes(region as RecallRegion)) {
      throw new Error(`Unsupported Recall region: ${region}`);
    }
  }

  async getCompletedTranscript(args: {
    transcriptId: string;
    recordingId?: string;
    botId?: string;
  }): Promise<TranscriptInput> {
    const artifact = await this.request<RecallTranscriptArtifact>(
      `/api/v1/transcript/${encodeURIComponent(args.transcriptId)}/`,
    );
    const response = await this.fetcher(artifact.data.download_url);
    if (!response.ok) {
      throw new Error(`Recall transcript download failed (${response.status})`);
    }
    const segments = (await response.json()) as RecallTranscriptSegment[];
    const utterances = normalizeTranscript(segments);
    const startedAt = inferStartedAt(segments) ?? new Date().toISOString();
    return {
      recallTranscriptId: args.transcriptId,
      recallRecordingId: args.recordingId,
      recallBotId: args.botId,
      title: `Recall meeting · ${new Date(startedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}`,
      startedAt,
      utterances,
    };
  }

  private async request<T>(path: string): Promise<T> {
    const url = `https://${this.region}.recall.ai${path}`;
    let response: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await this.fetcher(url, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          accept: "application/json",
        },
      });
      if (![429, 503, 507].includes(response.status) || attempt === 5) break;
      const retryAfter = Number(response.headers.get("retry-after"));
      const baseSeconds = Number.isFinite(retryAfter)
        ? retryAfter
        : response.status === 507
          ? 30
          : response.status === 503
            ? 10
            : 5;
      await new Promise((resolve) =>
        setTimeout(resolve, (baseSeconds + Math.random() * 2) * 1000),
      );
    }
    if (!response?.ok) {
      const detail = await response?.text();
      throw new Error(
        `Recall API failed (${response?.status ?? "network"})${detail ? `: ${detail}` : ""}`,
      );
    }
    return (await response.json()) as T;
  }
}

export function normalizeTranscript(segments: RecallTranscriptSegment[]) {
  return segments
    .filter((segment) => segment.words?.length)
    .map((segment) => {
      const first = segment.words[0];
      const last = segment.words[segment.words.length - 1];
      return {
        speaker:
          segment.speaker ?? segment.participant?.name ?? "Unknown speaker",
        startSeconds: wordTime(first, "start"),
        endSeconds: wordTime(last, "end"),
        text: segment.words
          .map((word) => word.text)
          .join(" ")
          .trim(),
      };
    })
    .filter((segment) => segment.text.length > 0);
}

function wordTime(
  word: RecallTranscriptSegment["words"][number],
  edge: "start" | "end",
) {
  const timestamp =
    edge === "start" ? word.start_timestamp : word.end_timestamp;
  if (typeof timestamp === "number") return timestamp;
  if (timestamp?.relative != null) return timestamp.relative;
  if (edge === "start") {
    return word.start_time ?? word.timestamp?.relative ?? 0;
  }
  return word.end_time ?? word.timestamp?.relative ?? 0;
}

function inferStartedAt(segments: RecallTranscriptSegment[]) {
  for (const segment of segments) {
    for (const word of segment.words ?? []) {
      if (word.timestamp?.absolute) {
        return recordingStart(word.timestamp.absolute, word.timestamp.relative);
      }
      if (
        typeof word.start_timestamp === "object" &&
        word.start_timestamp?.absolute
      ) {
        return recordingStart(
          word.start_timestamp.absolute,
          word.start_timestamp.relative,
        );
      }
    }
  }
  return null;
}

function recordingStart(absolute: string, relative = 0) {
  return new Date(new Date(absolute).getTime() - relative * 1000).toISOString();
}
