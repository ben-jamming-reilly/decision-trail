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
  "why",
  "which",
  "this",
  "with",
]);

export function queryTerms(query: string) {
  return (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (term) => term.length > 2 && !STOP_WORDS.has(term),
  );
}

export function scoreSearchResult(
  terms: string[],
  values: { claim: string; entityName: string; entityDescription: string },
) {
  const claimText = values.claim.toLowerCase();
  const entityName = values.entityName.toLowerCase();
  const entityDescription = values.entityDescription.toLowerCase();
  // Claim text is the strongest evidence; entity metadata broadens recall when
  // the user's wording names the subject rather than the statement itself.
  return terms.reduce(
    (score, term) =>
      score +
      (claimText.includes(term) ? 3 : 0) +
      (entityName.includes(term) ? 2 : 0) +
      (entityDescription.includes(term) ? 1 : 0),
    0,
  );
}
