import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_MODEL = "gpt-5-mini";

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getDecisionModel() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const provider = createOpenAI({ apiKey });
  return provider.responses(process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL);
}
