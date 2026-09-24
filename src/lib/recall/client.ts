import type {
  RecallBot,
  RecallRegion,
  RecallTranscriptArtifact,
  RecallTranscriptSegment,
} from "@/lib/recall/types";
import { RECALL_REGIONS } from "@/lib/recall/types";
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
    trailId: string;
    transcriptId: string;
    recordingId?: string;
    botId?: string;
    title?: string;
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
      trailId: args.trailId,
      recallTranscriptId: args.transcriptId,
      recallRecordingId: args.recordingId,
      recallBotId: args.botId,
      title: args.title ?? "Recall meeting",
      startedAt,
      utterances,
    };
  }

  async createBot(args: {
    meetingUrl: string;
    title: string;
    joinAt: string;
    captureId: string;
    trailId: string;
  }) {
    return this.request<{ id: string }>("/api/v1/bot/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        meeting_url: args.meetingUrl,
        bot_name: "Decision Trail",
        join_at: args.joinAt,
        metadata: {
          trailId: args.trailId,
          meetingId: args.captureId,
          recall_knowledge_capture_id: args.captureId,
          recall_knowledge_title: args.title,
        },
        recording_config: { video_mixed_mp4: {}, participant_events: {} },
        chat: {
          on_bot_join: {
            send_to: "everyone",
            message:
              "Decision Trail joined. This meeting will be recorded and transcribed as shared evidence.",
            pin: true,
          },
        },
      }),
    });
  }

  async getBot(botId: string) {
    return this.request<RecallBot>(`/api/v1/bot/${encodeURIComponent(botId)}/`);
  }

  async createAsyncTranscript(recordingId: string, keyTerms: string[]) {
    return this.request<{ id: string }>(
      `/api/v1/recording/${encodeURIComponent(recordingId)}/create_transcript/`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: {
            recallai_async: {
              language_code: "auto",
              ...(keyTerms.length ? { key_terms: keyTerms.slice(0, 100) } : {}),
            },
          },
          diarization: { use_separate_streams_when_available: true },
        }),
      },
    );
  }

  async getFreshVideoUrl(botId: string) {
    const bot = await this.getBot(botId);
    const video = bot.recordings
      ?.flatMap((recording) => recording.media_shortcuts?.video_mixed ?? [])
      .find(
        (artifact) =>
          artifact.status?.code === "done" && artifact.data?.download_url,
      );
    return video?.data?.download_url ?? null;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `https://${this.region}.recall.ai${path}`;
    let response: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", this.apiKey);
      headers.set("accept", "application/json");
      response = await this.fetcher(url, { ...init, headers });
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
      const participant = segment.participant;
      const speaker = segment.speaker ?? participant?.name ?? "Unknown speaker";
      return {
        speaker,
        speakerIdentity: participantIdentity(participant, speaker),
        ...(participant?.email
          ? { speakerEmail: participant.email.toLowerCase() }
          : {}),
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

function participantIdentity(
  participant: RecallTranscriptSegment["participant"],
  speaker: string,
) {
  const email = participant?.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const zoomId =
    participant?.extra_data?.zoom?.conf_user_id ??
    participant?.extra_data?.zoom?.user_conf_id;
  if (zoomId) return `zoom:${zoomId}`;
  const normalizedName = speaker.trim().toLowerCase().replace(/\s+/g, " ");
  return `${participant?.platform ?? "display-name"}:${normalizedName}`;
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
