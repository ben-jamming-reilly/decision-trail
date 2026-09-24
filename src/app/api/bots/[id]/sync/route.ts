import { NextResponse } from "next/server";
import { getRepository } from "@/data";
import { ingestTranscript } from "@/lib/ai";
import { getRecallClient } from "@/lib/recall";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repository = getRepository();
    const capture = await repository.getCaptureByBotId(id);
    if (!capture) {
      return NextResponse.json(
        { error: "Meeting capture not found" },
        { status: 404 },
      );
    }
    const bot = await getRecallClient().getBot(id);
    const latest = bot.status_changes?.at(-1);
    const recording = bot.recordings?.[0];
    const transcript = recording?.media_shortcuts?.transcript;
    let meetingId = capture.meetingId;
    let extractedClaims: number | undefined;
    let analysisError = capture.meetingId ? capture.error : undefined;
    let analysisSummary = capture.meetingId ? capture.statusDetail : undefined;

    if (latest) {
      const status = captureStatus(latest.code);
      await repository.updateCapture(capture.id, {
        ...(status ? { status } : {}),
        statusDetail: latest.sub_code ?? null,
        lastBotEventAt: latest.created_at,
        ...(latest.code === "fatal"
          ? {
              error: `The bot stopped unexpectedly${latest.sub_code ? `: ${latest.sub_code}` : ""}`,
            }
          : {}),
      });
    }

    if (
      transcript?.id &&
      transcript.status?.code === "done" &&
      !capture.meetingId
    ) {
      const input = await getRecallClient().getCompletedTranscript({
        transcriptId: transcript.id,
        recordingId: recording?.id,
        botId: bot.id,
        title: capture.title,
      });
      const ingestion = await ingestTranscript(repository, input);
      meetingId = ingestion.meetingId;
      extractedClaims = ingestion.extractedClaims;
      analysisError = ingestion.analysisError;
      analysisSummary = analysisError
        ? "Transcript ready; AI extraction needs attention"
        : `AI extracted ${extractedClaims} claim${extractedClaims === 1 ? "" : "s"}`;
      await repository.updateCapture(capture.id, {
        status: "ready",
        statusDetail: analysisSummary,
        recordingId: recording?.id,
        transcriptId: transcript.id,
        meetingId,
        error: analysisError ?? null,
      });
    }

    return NextResponse.json({
      botId: bot.id,
      status: latest?.code ?? "pending",
      statusDetail: latest?.sub_code ?? null,
      transcriptStatus: transcript?.status?.code ?? null,
      meetingId,
      extractedClaims,
      analysisError,
      analysisSummary,
    });
  } catch (error) {
    console.error("[bots] failed to sync Recall bot", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync bot" },
      { status: 502 },
    );
  }
}

function captureStatus(code: string) {
  const statuses = {
    joining_call: "joining",
    in_waiting_room: "waiting_room",
    in_call_not_recording: "in_call",
    in_call_recording: "recording",
    call_ended: "processing",
    done: "processing",
    fatal: "failed",
  } as const;
  return statuses[code as keyof typeof statuses];
}
