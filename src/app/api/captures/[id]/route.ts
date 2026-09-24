import { NextResponse } from "next/server";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const capture = await getRepository().getCapture(id);
  if (!capture) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      id: capture.id,
      trailId: capture.trailId,
      title: capture.title,
      joinAt: capture.joinAt,
      botId: capture.botId,
      status: capture.status,
      statusDetail: capture.statusDetail,
      meetingId: capture.meetingId,
      error: capture.error,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
