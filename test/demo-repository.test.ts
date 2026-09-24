import { describe, expect, it } from "vitest";
import { DemoKnowledgeRepository } from "@/data/demo-repository";

describe("demo knowledge repository", () => {
  it("returns cross-meeting claims with evidence", async () => {
    const results = await new DemoKnowledgeRepository().search(
      "What changed about the target date?",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].claim.text).toContain("target date");
    expect(results[0].claim.evidence.length).toBeGreaterThan(0);
    expect(results.some((result) => result.claim.state === "superseded")).toBe(
      true,
    );
  });

  it("ranks the direct explanation for a cross-meeting why query first", async () => {
    const results = await new DemoKnowledgeRepository().search(
      "Why was the launch delayed?",
    );
    expect(results[0].claim.text).toContain("delayed from March 15 to April 2");
  });

  it("exposes active, disputed, and superseded history", async () => {
    const entity = await new DemoKnowledgeRepository().getEntity(
      "enterprise-bulk-export",
    );
    expect(new Set(entity?.claims.map((claim) => claim.state))).toEqual(
      new Set(["active", "disputed", "superseded"]),
    );
  });
});
