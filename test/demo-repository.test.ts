import { describe, expect, it } from "vitest";
import { DemoKnowledgeRepository } from "@/data/demo-repository";

describe("demo knowledge repository", () => {
  it("returns cross-meeting claims with evidence", async () => {
    const results = await new DemoKnowledgeRepository().search(
      "What changed about the Atlas partners?",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].claim.evidence.length).toBeGreaterThan(0);
    expect(results.some((result) => result.claim.state === "superseded")).toBe(
      true,
    );
  });

  it("exposes active, disputed, and superseded history", async () => {
    const entity = await new DemoKnowledgeRepository().getEntity("atlas-pilot");
    expect(new Set(entity?.claims.map((claim) => claim.state))).toEqual(
      new Set(["active", "disputed", "superseded"]),
    );
  });
});
