import type { QueryResult } from "@/lib/domain";

export function selectAnswerResults(results: QueryResult[]) {
  return results
    .slice(0, 8)
    .toSorted((a, b) => b.claim.recordedAt.localeCompare(a.claim.recordedAt));
}

export function buildGroundedEvidence(results: QueryResult[]) {
  return selectAnswerResults(results).map((result, index) => ({
    source: index + 1,
    entity: result.entity.name,
    kind: result.entity.kind,
    state: result.claim.state,
    recordedAt: result.claim.recordedAt,
    claim: result.claim.text,
    passages: result.claim.evidence.map((item) => ({
      meeting: item.meetingTitle,
      date: item.meetingDate,
      speaker: item.speaker,
      timeSeconds: item.startSeconds,
      quote: item.quote,
    })),
  }));
}

export function getAnswerCitation(
  results: QueryResult[],
  sourceNumber: number,
) {
  const result = selectAnswerResults(results)[sourceNumber - 1];
  const evidence = result?.claim.evidence.toSorted((a, b) =>
    b.meetingDate.localeCompare(a.meetingDate),
  )[0];
  if (!evidence) return null;

  return {
    href: `/meetings/${evidence.meetingId}?t=${evidence.startSeconds}#t-${Math.floor(evidence.startSeconds)}`,
    meetingTitle: evidence.meetingTitle,
  };
}
