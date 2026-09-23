import { getDb } from "@/db";
import { DemoKnowledgeRepository } from "@/data/demo-repository";
import { PostgresKnowledgeRepository } from "@/data/postgres-repository";
import type { KnowledgeRepository } from "@/lib/repository";

export function getRepository(): KnowledgeRepository {
  if (process.env.DEMO_MODE === "true") return new DemoKnowledgeRepository();
  try {
    return new PostgresKnowledgeRepository(getDb());
  } catch (error) {
    if (process.env.DEMO_MODE === "false") throw error;
    return new DemoKnowledgeRepository();
  }
}
