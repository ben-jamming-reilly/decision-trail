"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowIcon, SearchIcon } from "@/components/icons";
import type { QueryResult } from "@/lib/domain";
import { StatusPill } from "@/components/status-pill";

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
    <div className={full ? "query-panel query-panel-full" : "query-panel"}>
      <form onSubmit={submit} className="query-form">
        <SearchIcon />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask across every meeting…"
          aria-label="Search claims"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching" : "Ask"}
          <ArrowIcon />
        </button>
      </form>
      <div className="query-suggestions" aria-label="Suggested questions">
        {suggestions.map((suggestion) => (
          <button
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
        <div className="ai-answer" aria-live="polite">
          <div>
            <span className="integration-badge ai-badge">
              <span /> AI synthesis
            </span>
            <small>Grounded only in the matching claims below</small>
          </div>
          {answer ? <p>{answer}</p> : <p className="empty">{answerError}</p>}
        </div>
      )}
      {results && (
        <div className="query-results" aria-live="polite">
          <p className="eyebrow">{results.length} source-grounded matches</p>
          {results.length === 0 ? (
            <p className="empty">
              No matching claims. Try “launch”, “target date”, or “customer”.
            </p>
          ) : (
            results.map((result) => (
              <Link
                href={`/entities/${result.entity.slug}`}
                className="query-result"
                key={`${result.entity.id}-${result.claim.id}`}
              >
                <div>
                  <span className="kind">{result.entity.kind}</span>
                  <StatusPill state={result.claim.state} />
                </div>
                <h3>{result.entity.name}</h3>
                <p>{result.claim.text}</p>
                <small>
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
