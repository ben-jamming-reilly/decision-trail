import { getRepository } from "@/data";
import { ingestTranscript } from "@/lib/ai";
import { getRecallClient } from "@/lib/recall/config";
import type { CaptureStatus, MeetingCapture } from "@/lib/repository";

type RecallResource = {
  id?: string;
  metadata?: Record<string, unknown> | null;
};

export type RecallWebhookEvent = {
  event: string;
  data?: {
    data?: {
      code?: string;
      sub_code?: string | null;
      updated_at?: string;
    };
    bot?: RecallResource;
    recording?: RecallResource;
    transcript?: RecallResource;
  };
};

const BOT_STATUS: Record<string, CaptureStatus> = {
  "bot.joining_call": "joining",
  "bot.in_waiting_room": "waiting_room",
  "bot.in_call_not_recording": "in_call",
  "bot.recording_permission_allowed": "in_call",
  "bot.in_call_recording": "recording",
  "bot.call_ended": "processing",
  "bot.done": "processing",
};

const FAILURE_EVENTS: Record<string, string> = {
  "bot.fatal": "The bot stopped unexpectedly",
  "bot.recording_permission_denied": "Recording permission was denied",
  "recording.failed": "Recording failed",
  "transcript.failed": "Transcription failed",
};

export async function processRecallWebhook(event: RecallWebhookEvent) {
  const repository = getRepository();
  const capture = await findCapture(event);
  if (!capture) {
    console.warn(`[webhook] ${event.event}: no matching meeting capture`);
    return;
  }

  const failure = FAILURE_EVENTS[event.event];
  if (failure) {
    const detail = event.data?.data?.sub_code;
    await repository.updateCapture(capture.id, {
      status: "failed",
      statusDetail: detail ?? null,
      error: [failure, detail].filter(Boolean).join(": "),
    });
    return;
  }

  if (event.event.startsWith("bot.")) {
    await processBotEvent(capture, event);
    return;
  }

  if (event.event === "recording.done") {
    const recordingId = event.data?.recording?.id;
    if (!recordingId) throw new Error("recording.done had no recording id");
    // Bias post-meeting transcription with names and terms already established
    // in this trail; vocabulary from other trails must not leak into it.
    const keyTerms = await repository.getTrailVocabulary(capture.trailId);
    const transcript = await getRecallClient().createAsyncTranscript(
      recordingId,
      keyTerms,
    );
    await repository.updateCapture(capture.id, {
      status: "processing",
      statusDetail: keyTerms.length
        ? `Transcribing with ${keyTerms.length} trail key terms`
        : "Transcribing recording",
      recordingId,
      transcriptId: transcript.id,
    });
    return;
  }

  if (event.event === "transcript.done") {
    // Webhooks can be retried. Once a capture points at its durable meeting,
    // reprocessing would only duplicate extraction work.
    if (capture.meetingId) return;
    const transcriptId = event.data?.transcript?.id;
    if (!transcriptId) throw new Error("transcript.done had no transcript id");
    const transcript = await getRecallClient().getCompletedTranscript({
      trailId: capture.trailId,
      transcriptId,
      recordingId: event.data?.recording?.id ?? capture.recordingId,
      botId: event.data?.bot?.id ?? capture.botId,
      title: capture.title,
    });
    const { meetingId, extractedClaims, analysisError } =
      await ingestTranscript(repository, transcript);
    await repository.updateCapture(capture.id, {
      status: "ready",
      statusDetail: analysisError
        ? "Transcript ready; AI extraction needs attention"
        : `AI extracted ${extractedClaims} claim${extractedClaims === 1 ? "" : "s"}`,
      transcriptId,
      meetingId,
      error: analysisError ?? null,
    });
  }
}

async function findCapture(event: RecallWebhookEvent) {
  const repository = getRepository();
  const captureId = event.data?.bot?.metadata?.recall_knowledge_capture_id;
  if (typeof captureId === "string") {
    const capture = await repository.getCapture(captureId);
    if (capture) return capture;
  }
  // Older or manually-created bots may not carry application metadata.
  const botId = event.data?.bot?.id;
  return botId ? repository.getCaptureByBotId(botId) : null;
}

async function processBotEvent(
  capture: MeetingCapture,
  event: RecallWebhookEvent,
) {
  const status = BOT_STATUS[event.event];
  if (!status) {
    await getRepository().updateCapture(capture.id, {
      statusDetail:
        [event.data?.data?.code, event.data?.data?.sub_code]
          .filter(Boolean)
          .join(": ") || event.event,
      ...(event.data?.data?.updated_at
        ? { lastBotEventAt: event.data.data.updated_at }
        : {}),
    });
    return;
  }
  if (capture.status === "ready" || capture.status === "failed") return;
  // Bot events may arrive late or out of order. Never move a capture backward
  // after its recording has entered the post-meeting pipeline.
  if (capture.status === "processing" && status !== "processing") return;
  const eventAt = event.data?.data?.updated_at;
  if (
    eventAt &&
    capture.lastBotEventAt &&
    Date.parse(eventAt) <= Date.parse(capture.lastBotEventAt)
  ) {
    return;
  }
  await getRepository().updateCapture(capture.id, {
    status,
    statusDetail: event.data?.data?.sub_code ?? null,
    ...(eventAt ? { lastBotEventAt: eventAt } : {}),
  });
}
