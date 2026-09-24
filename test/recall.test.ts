import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  normalizeTranscript,
  RecallClient,
  verifyRecallWebhook,
} from "@/lib/recall";

describe("Recall webhook verification", () => {
  const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;
  const rawBody = '{"event":"transcript.done"}';
  const timestamp = "1700000000";
  const id = "msg_test";
  const signature = createHmac("sha256", Buffer.from("test-secret"))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  it("accepts a valid v1 signature", () => {
    expect(() =>
      verifyRecallWebhook({
        secret,
        headers: { id, timestamp, signature: `v1,${signature}` },
        rawBody,
        nowSeconds: Number(timestamp),
      }),
    ).not.toThrow();
  });

  it("rejects changed payloads and stale requests", () => {
    expect(() =>
      verifyRecallWebhook({
        secret,
        headers: { id, timestamp, signature: `v1,${signature}` },
        rawBody: `${rawBody} `,
        nowSeconds: Number(timestamp),
      }),
    ).toThrow("did not match");
    expect(() =>
      verifyRecallWebhook({
        secret,
        headers: { id, timestamp, signature: `v1,${signature}` },
        rawBody,
        nowSeconds: Number(timestamp) + 301,
      }),
    ).toThrow("replay window");
  });
});

describe("Recall transcript normalization", () => {
  it("preserves speaker, relative timestamps, and exact word text", () => {
    expect(
      normalizeTranscript([
        {
          participant: { name: "Maya" },
          words: [
            { text: "Hello", start_timestamp: { relative: 3.2 } },
            { text: "team.", end_timestamp: { relative: 4.7 } },
          ],
        },
      ]),
    ).toEqual([
      {
        speaker: "Maya",
        speakerIdentity: "display-name:maya",
        startSeconds: 3.2,
        endSeconds: 4.7,
        text: "Hello team.",
      },
    ]);
  });

  it("uses durable participant identifiers before display names", () => {
    const [email, zoom] = normalizeTranscript([
      {
        participant: { name: "Sarah", email: "SARAH@example.com" },
        words: [{ text: "One", start_time: 0, end_time: 1 }],
      },
      {
        participant: {
          name: "Sarah C.",
          platform: "zoom",
          extra_data: { zoom: { conf_user_id: "zoom-user-42" } },
        },
        words: [{ text: "Two", start_time: 1, end_time: 2 }],
      },
    ]);
    expect(email.speakerIdentity).toBe("email:sarah@example.com");
    expect(email.speakerEmail).toBe("sarah@example.com");
    expect(zoom.speakerIdentity).toBe("zoom:zoom-user-42");
  });
});

describe("Recall bot creation", () => {
  it("sends a scheduled, disclosed bot with server-side authorization", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ id: "bot_test" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new RecallClient("secret-test-key", "us-west-2", fetcher);

    await expect(
      client.createBot({
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        title: "Product sync",
        captureId: "capture_test",
        trailId: "product-decisions",
        joinAt: "2026-09-24T18:00:00.000Z",
      }),
    ).resolves.toEqual({ id: "bot_test" });

    expect(requestUrl).toBe("https://us-west-2.recall.ai/api/v1/bot/");
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("authorization")).toBe("secret-test-key");
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      meeting_url: "https://meet.google.com/abc-defg-hij",
      join_at: "2026-09-24T18:00:00.000Z",
      bot_name: "Decision Trail",
      metadata: {
        trailId: "product-decisions",
        meetingId: "capture_test",
        recall_knowledge_capture_id: "capture_test",
        recall_knowledge_title: "Product sync",
      },
      chat: { on_bot_join: { send_to: "everyone", pin: true } },
      recording_config: { video_mixed_mp4: {}, participant_events: {} },
    });
    expect(JSON.stringify(JSON.parse(String(requestInit?.body)))).not.toContain(
      "recallai_streaming",
    );
  });

  it("starts post-meeting transcription with trail vocabulary", async () => {
    let requestUrl = "";
    let requestBody = "";
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ id: "transcript_test" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new RecallClient("secret-test-key", "us-west-2", fetcher);
    await client.createAsyncTranscript("recording_test", [
      "Acme Cloud",
      "Sam Rao",
    ]);
    expect(requestUrl).toContain(
      "/recording/recording_test/create_transcript/",
    );
    expect(JSON.parse(requestBody)).toMatchObject({
      provider: {
        recallai_async: {
          language_code: "auto",
          key_terms: ["Acme Cloud", "Sam Rao"],
        },
      },
      diarization: { use_separate_streams_when_available: true },
    });
  });
});
