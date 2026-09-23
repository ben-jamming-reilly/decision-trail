import { NextResponse } from "next/server";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 200) {
    return NextResponse.json(
      { error: "Query must be 200 characters or fewer" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    query,
    results: await getRepository().search(query),
  });
}
