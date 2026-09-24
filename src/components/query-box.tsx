"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowIcon, SearchIcon } from "@/components/icons";
import type { QueryResult } from "@/lib/domain";
import { StatusPill } from "@/components/status-pill";
import { getAnswerCitation } from "@/lib/answer-evidence";

function AnswerWithMeetingLinks({
  answer,
  results,
}: {
  answer: string;
  results: QueryResult[];
}) {
  return answer.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return part;

    const citation = getAnswerCitation(results, Number(match[1]));
    if (!citation) return part;

    return (
      <Link
        href={citation.href}
        title={`Open ${citation.meetingTitle}`}
        className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
        key={`${part}-${index}`}
      >
        {part}
      </Link>
    );
  });
}

export function QueryBox({ full = false }: { full?: boolean }) {
  const [query, setQuery] = useState(full ? "Why was the launch delayed?" : "");
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery(nextQuery: string) {
    if (!nextQuery.trim()) return;
    setLoading(true);
    setAnswer("");
    setAnswerError(null);
    try {
      const [searchResponse, answerResponse] = await Promise.all([
        fetch(`/api/query?q=${encodeURIComponent(nextQuery)}`),
        fetch("/api/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: nextQuery }),
        }),
      ]);
      const body = (await searchResponse.json()) as {
        error?: string;
        results?: QueryResult[];
      };
      if (!searchResponse.ok) throw new Error(body.error || "Search failed");
      setResults(body.results ?? []);

      if (!answerResponse.ok || !answerResponse.body) {
        const errorBody = (await answerResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        setAnswerError(errorBody?.error || "AI answer unavailable");
        return;
      }
      const reader = answerResponse.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
      text += decoder.decode();
      if (text.trim()) setAnswer(text);
      else setAnswerError("AI answer unavailable");
    } catch (queryError) {
      setAnswerError(
        queryError instanceof Error ? queryError.message : "Query failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runQuery(query);
  }

  const suggestions = [
    "Why was the launch delayed?",
    "What changed about the target date?",
    "Which customer conversations influenced this requirement?",
  ];

  return (
    <div className={full ? "mt-7 max-w-[860px]" : "mt-4"}>
      <form
        onSubmit={submit}
        className="flex min-h-[46px] items-center gap-2.5 rounded-lg border border-border bg-white py-[5px] pr-[5px] pl-[13px] [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
      >
        <SearchIcon />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-foreground outline-0 placeholder:text-zinc-400"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask across every meeting…"
          aria-label="Search claims"
        />
        <button
          className="inline-flex h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-md bg-primary px-[13px] text-xs font-medium text-primary-foreground disabled:opacity-50 [&_svg]:w-3.5"
          type="submit"
          disabled={loading}
        >
          {loading ? "Searching" : "Ask"}
          <ArrowIcon />
        </button>
      </form>
      <div
        className="mt-2.5 flex flex-wrap gap-[7px]"
        aria-label="Suggested questions"
      >
        {suggestions.map((suggestion) => (
          <button
            className="cursor-pointer rounded-full border border-border bg-white px-[9px] py-1.5 text-[10px] text-zinc-600 hover:border-zinc-400 hover:text-foreground disabled:cursor-default disabled:opacity-50"
            type="button"
            key={suggestion}
            onClick={() => {
              setQuery(suggestion);
              void runQuery(suggestion);
            }}
            disabled={loading}
          >
            {suggestion}
          </button>
        ))}
      </div>
      {(answer || answerError) && (
        <div
          className="mt-3.5 rounded-lg border border-blue-200 bg-blue-50 p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-[30px] w-fit shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-blue-200 bg-white px-2.5 text-[11px] text-blue-700">
              <span className="size-[7px] shrink-0 rounded-full bg-blue-600 ring-[3px] ring-blue-100" />
              AI synthesis
            </span>
            <small className="text-[10px] text-slate-500">
              Grounded only in the matching claims below
            </small>
          </div>
          {answer ? (
            <p className="mt-[13px] whitespace-pre-wrap leading-[1.6] text-[#1e3a5f]">
              <AnswerWithMeetingLinks answer={answer} results={results ?? []} />
            </p>
          ) : (
            <p className="mt-[13px] text-muted-foreground">{answerError}</p>
          )}
        </div>
      )}
      {results && (
        <div
          className="mt-3 grid gap-2 border-t border-border pt-4"
          aria-live="polite"
        >
          <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {results.length} source-grounded matches
          </p>
          {results.length === 0 ? (
            <p className="text-muted-foreground">
              No matching claims. Try “launch”, “target date”, or “customer”.
            </p>
          ) : (
            results.map((result) => (
              <Link
                href={`/entities/${result.entity.slug}`}
                className="rounded-lg border border-border p-3.5 hover:bg-zinc-50"
                key={`${result.entity.id}-${result.claim.id}`}
              >
                <div className="flex justify-between">
                  <span className="inline-flex min-h-[21px] items-center rounded-full border border-border bg-muted px-[7px] text-[9px] font-semibold tracking-[0.06em] text-zinc-600 uppercase">
                    {result.entity.kind}
                  </span>
                  <StatusPill state={result.claim.state} />
                </div>
                <h3 className="mt-2 mb-1 font-semibold">
                  {result.entity.name}
                </h3>
                <p className="mb-2 leading-[1.45] text-muted-foreground">
                  {result.claim.text}
                </p>
                <small className="text-muted-foreground">
                  {result.claim.evidence.length} evidence source
                  {result.claim.evidence.length === 1 ? "" : "s"}
                </small>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
