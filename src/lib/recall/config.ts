import { RecallClient } from "@/lib/recall/client";

export function getRecallClient() {
  const apiKey = process.env.RECALL_API_KEY?.trim();
  if (!apiKey) throw new Error("RECALL_API_KEY is not configured");
  return new RecallClient(apiKey, process.env.RECALL_REGION ?? "us-west-2");
}
