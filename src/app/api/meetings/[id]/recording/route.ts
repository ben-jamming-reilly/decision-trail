import { NextResponse } from "next/server";
import { getRepository } from "@/data";
import { getRecallClient } from "@/lib/recall";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getRepository().getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  if (!meeting.recallBotId) {
    return NextResponse.json(
      { error: "No Recall recording is available for this meeting" },
      { status: 404 },
    );
  }
  try {
    // Recall media URLs are presigned and expire. Resolve one on demand and
    // prevent browsers or intermediaries from caching it.
    const url = await getRecallClient().getFreshVideoUrl(meeting.recallBotId);
    if (!url) {
      return NextResponse.json(
        { error: "The recording is not ready or has expired" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { url },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load recording",
      },
      { status: 502 },
    );
  }
}
