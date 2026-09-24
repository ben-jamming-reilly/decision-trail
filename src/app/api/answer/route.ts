import { NextResponse } from "next/server";
import { getRepository } from "@/data";
import { streamGroundedAnswer } from "@/lib/ai/answer";
import { isAIConfigured } from "@/lib/ai/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query =
    body && typeof body === "object" && "query" in body
      ? String(body.query).trim()
      : "";
  if (!query || query.length > 200) {
    return NextResponse.json(
      { error: "Query must be between 1 and 200 characters" },
      { status: 400 },
    );
  }

  const results = await getRepository().search(query);
  if (!results.length) {
    return NextResponse.json(
      { error: "No grounded evidence matched this question" },
      { status: 404 },
    );
  }

  const result = streamGroundedAnswer(query, results);
  return result.toTextStreamResponse({
    headers: { "Cache-Control": "no-store" },
  });
}
