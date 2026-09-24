import { createHmac, timingSafeEqual } from "node:crypto";

interface RecallVerificationHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

/** Recall signs the unmodified body as `id.timestamp.body` with HMAC-SHA256. */
export function readRecallHeaders(headers: Headers): RecallVerificationHeaders {
  const id = headers.get("webhook-id") ?? headers.get("svix-id") ?? "";
  const timestamp =
    headers.get("webhook-timestamp") ?? headers.get("svix-timestamp") ?? "";
  const signature =
    headers.get("webhook-signature") ?? headers.get("svix-signature") ?? "";
  if (!id || !timestamp || !signature) {
    throw new Error("Missing Recall webhook verification headers");
  }
  return { id, timestamp, signature };
}

export function verifyRecallWebhook(args: {
  secret: string;
  headers: RecallVerificationHeaders;
  rawBody: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}) {
  const {
    secret,
    headers,
    rawBody,
    nowSeconds = Math.floor(Date.now() / 1000),
    toleranceSeconds = 300,
  } = args;
  if (!secret.startsWith("whsec_")) {
    throw new Error("Recall webhook secret must start with whsec_");
  }
  const timestamp = Number(headers.timestamp);
  if (!Number.isSafeInteger(timestamp))
    throw new Error("Invalid webhook timestamp");
  // Reject valid signatures outside the replay window before doing any work.
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new Error("Webhook timestamp is outside the replay window");
  }

  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest();

  const matches = headers.signature.split(" ").some((versioned) => {
    // The header can contain multiple space-separated `v1,<signature>` pairs.
    const [version, value] = versioned.split(",", 2);
    if (version !== "v1" || !value) return false;
    const passed = Buffer.from(value, "base64");
    return (
      passed.length === expected.length && timingSafeEqual(passed, expected)
    );
  });
  if (!matches) throw new Error("Recall webhook signature did not match");
}
