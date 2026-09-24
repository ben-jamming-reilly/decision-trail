import { NextResponse } from "next/server";
import { getRepository } from "@/data";
import { getRecallClient } from "@/lib/recall";
import { normalizeTrailId } from "@/lib/trail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let captureId: string | undefined;
  try {
    const body = (await request.json()) as {
      title?: unknown;
      trailId?: unknown;
      meetingUrl?: unknown;
      joinAt?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const trailId = normalizeTrailId(body.trailId);
    const meetingUrl =
      typeof body.meetingUrl === "string" ? body.meetingUrl.trim() : "";
    const joinAt = typeof body.joinAt === "string" ? body.joinAt.trim() : "";
    if (!title || title.length > 120) {
      return NextResponse.json(
        { error: "Meeting title is required and must be under 120 characters" },
        { status: 400 },
      );
    }
    if (!trailId) {
      return NextResponse.json(
        { error: "Trail ID must be a lowercase slug under 80 characters" },
        { status: 400 },
      );
    }
    if (!isMeetingUrl(meetingUrl)) {
      return NextResponse.json(
        { error: "Enter a valid HTTPS meeting URL" },
        { status: 400 },
      );
    }
    if (joinAt) {
      const scheduled = new Date(joinAt);
      if (
        Number.isNaN(scheduled.getTime()) ||
        scheduled.getTime() <= Date.now()
      ) {
        return NextResponse.json(
          { error: "Scheduled join time must be in the future" },
          { status: 400 },
        );
      }
    }

    const scheduledJoinAt = joinAt
      ? new Date(joinAt).toISOString()
      : new Date().toISOString();
    const repository = getRepository();
    const capture = await repository.createCapture({
      trailId,
      title,
      meetingUrl,
      joinAt: scheduledJoinAt,
    });
    captureId = capture.id;
    const bot = await getRecallClient().createBot({
      meetingUrl,
      title,
      captureId: capture.id,
      trailId,
      joinAt: scheduledJoinAt,
    });
    await repository.updateCapture(capture.id, {
      botId: bot.id,
      status: joinAt ? "scheduled" : "joining",
      error: null,
    });
    return NextResponse.json({
      botId: bot.id,
      captureId: capture.id,
      status: joinAt ? "scheduled" : "joining_call",
    });
  } catch (error) {
    console.error("[bots] failed to create Recall bot", error);
    if (captureId) {
      await getRepository().updateCapture(captureId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to send bot",
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send bot" },
      { status: 502 },
    );
  }
}

function isMeetingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}
