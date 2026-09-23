"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowIcon, SearchIcon } from "@/components/icons";
import type { QueryResult } from "@/lib/domain";
import { StatusPill } from "@/components/status-pill";

export function QueryBox({ full = false }: { full?: boolean }) {
  const [query, setQuery] = useState(
    full ? "What changed about the Atlas pilot?" : "",
  );
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const response = await fetch(`/api/query?q=${encodeURIComponent(query)}`);
    const body = (await response.json()) as { results: QueryResult[] };
    setResults(body.results);
    setLoading(false);
  }

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
      {results && (
        <div className="query-results" aria-live="polite">
          <p className="eyebrow">{results.length} source-grounded matches</p>
          {results.length === 0 ? (
            <p className="empty">
              No matching claims. Try “Atlas”, “identity”, or “partners”.
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
