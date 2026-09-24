import { describe, expect, it } from "vitest";
import {
  buildGroundedEvidence,
  getAnswerCitation,
} from "@/lib/answer-evidence";
import { DemoKnowledgeRepository } from "@/data/demo-repository";

describe("grounded answer evidence", () => {
  it("presents the latest matching update as the first source", async () => {
    const results = await new DemoKnowledgeRepository().search(
      "What changed about the target date?",
    );

    const evidence = buildGroundedEvidence(results);

    expect(evidence[0].recordedAt).toBe(
      results
        .slice(0, 8)
        .map((result) => result.claim.recordedAt)
        .sort()
        .at(-1),
    );
    expect(evidence[0].state).toBe("active");
  });

  it("links a source number to its latest meeting passage", async () => {
    const results = await new DemoKnowledgeRepository().search(
      "Why was the launch delayed?",
    );

    const citation = getAnswerCitation(results, 1);

    expect(citation?.href).toBe(
      "/meetings/33333333-3333-4333-8333-333333333333?t=352#t-352",
    );
    expect(citation?.meetingTitle).toBe("Bulk export engineering review");
  });
});
