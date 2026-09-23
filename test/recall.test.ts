import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeTranscript } from "@/integrations/recall/client";
import { verifyRecallWebhook } from "@/integrations/recall/verify";

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
        startSeconds: 3.2,
        endSeconds: 4.7,
        text: "Hello team.",
      },
    ]);
  });
});
