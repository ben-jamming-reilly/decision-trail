import { NextResponse } from "next/server";
import { getRepository } from "@/data";
import { RecallClient } from "@/integrations/recall/client";
import type { RecallTranscriptDoneEvent } from "@/integrations/recall/types";
import {
  readRecallHeaders,
  verifyRecallWebhook,
} from "@/integrations/recall/verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );

  const rawBody = await request.text();
  let verificationHeaders;
  try {
    verificationHeaders = readRecallHeaders(request.headers);
    verifyRecallWebhook({ secret, headers: verificationHeaders, rawBody });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isEvent(payload))
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const repository = getRepository();
  if (await repository.hasWebhook(verificationHeaders.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (payload.event === "transcript.done") {
    const apiKey = process.env.RECALL_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "Recall API is not configured" },
        { status: 503 },
      );
    const event = payload as RecallTranscriptDoneEvent;
    const transcript = await new RecallClient(
      apiKey,
      process.env.RECALL_REGION ?? "us-west-2",
    ).getCompletedTranscript({
      transcriptId: event.data.transcript.id,
      recordingId: event.data.recording?.id,
      botId: event.data.bot?.id,
    });
    await repository.saveTranscript(transcript);
  }

  await repository.recordWebhook(
    verificationHeaders.id,
    payload.event,
    payload,
  );
  return NextResponse.json({ ok: true });
}

function isEvent(value: unknown): value is { event: string; data: unknown } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "event" in value &&
    typeof value.event === "string" &&
    "data" in value,
  );
}
