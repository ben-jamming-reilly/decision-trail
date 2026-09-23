const STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "did",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "the",
  "was",
  "what",
  "when",
  "where",
  "who",
  "with",
]);

export function queryTerms(query: string) {
  return (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (term) => term.length > 2 && !STOP_WORDS.has(term),
  );
}
