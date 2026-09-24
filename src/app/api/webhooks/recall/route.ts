import { after, NextResponse } from "next/server";
import { getRepository } from "@/data";
import {
  processRecallWebhook,
  readRecallHeaders,
  type RecallWebhookEvent,
  verifyRecallWebhook,
} from "@/lib/recall";

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
  const accepted = await repository.recordWebhook(
    verificationHeaders.id,
    payload.event,
    payload,
  );
  if (!accepted) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  after(async () => {
    try {
      await processRecallWebhook(payload);
      await repository.completeWebhook(verificationHeaders.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[webhook] ${payload.event} failed`, message);
      await repository.completeWebhook(verificationHeaders.id, message);
    }
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

function isEvent(value: unknown): value is RecallWebhookEvent {
  return Boolean(
    value &&
    typeof value === "object" &&
    "event" in value &&
    typeof value.event === "string" &&
    "data" in value,
  );
}
