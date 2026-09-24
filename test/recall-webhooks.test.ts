import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    getCapture: vi.fn(),
    getCaptureByBotId: vi.fn(),
    updateCapture: vi.fn(),
    saveTranscript: vi.fn(),
  },
  recall: {
    getCompletedTranscript: vi.fn(),
  },
}));

vi.mock("@/data", () => ({
  getRepository: () => mocks.repository,
}));

vi.mock("@/lib/recall/config", () => ({
  getRecallClient: () => mocks.recall,
}));

import { processRecallWebhook } from "@/lib/recall/webhooks";

const capture = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Product sync",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  joinAt: "2026-09-24T18:00:00.000Z",
  botId: "bot_test",
  status: "joining" as const,
};

describe("Recall lifecycle processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repository.getCapture.mockResolvedValue(capture);
    mocks.repository.getCaptureByBotId.mockResolvedValue(capture);
    mocks.repository.updateCapture.mockResolvedValue(capture);
  });

  it("persists bot status changes using capture metadata", async () => {
    await processRecallWebhook({
      event: "bot.in_call_recording",
      data: {
        bot: {
          id: "bot_test",
          metadata: { recall_knowledge_capture_id: capture.id },
        },
        data: {
          code: "in_call_recording",
          updated_at: "2026-09-24T18:01:00.000Z",
        },
      },
    });

    expect(mocks.repository.updateCapture).toHaveBeenCalledWith(capture.id, {
      status: "recording",
      statusDetail: null,
      lastBotEventAt: "2026-09-24T18:01:00.000Z",
    });
  });

  it("does not let a late bot event regress a completed capture", async () => {
    mocks.repository.getCapture.mockResolvedValue({
      ...capture,
      status: "ready",
      meetingId: "meeting_test",
    });

    await processRecallWebhook({
      event: "bot.done",
      data: {
        bot: {
          id: "bot_test",
          metadata: { recall_knowledge_capture_id: capture.id },
        },
      },
    });

    expect(mocks.repository.updateCapture).not.toHaveBeenCalled();
  });

  it("imports a completed transcript with the original meeting title", async () => {
    const transcript = {
      recallTranscriptId: "transcript_test",
      recallRecordingId: "recording_test",
      recallBotId: "bot_test",
      title: capture.title,
      startedAt: "2026-09-24T18:00:00.000Z",
      utterances: [],
    };
    mocks.recall.getCompletedTranscript.mockResolvedValue(transcript);
    mocks.repository.saveTranscript.mockResolvedValue("meeting_test");

    await processRecallWebhook({
      event: "transcript.done",
      data: {
        bot: {
          id: "bot_test",
          metadata: { recall_knowledge_capture_id: capture.id },
        },
        recording: { id: "recording_test" },
        transcript: { id: "transcript_test" },
      },
    });

    expect(mocks.recall.getCompletedTranscript).toHaveBeenCalledWith({
      transcriptId: "transcript_test",
      recordingId: "recording_test",
      botId: "bot_test",
      title: capture.title,
    });
    expect(mocks.repository.updateCapture).toHaveBeenLastCalledWith(
      capture.id,
      {
        status: "ready",
        statusDetail: "AI extracted 0 claims",
        transcriptId: "transcript_test",
        meetingId: "meeting_test",
        error: null,
      },
    );
  });
});
