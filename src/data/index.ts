import { getDb } from "@/db";
import { DemoKnowledgeRepository } from "@/data/demo-repository";
import { PostgresKnowledgeRepository } from "@/data/postgres-repository";
import type { KnowledgeRepository } from "@/lib/repository";

export function getRepository(): KnowledgeRepository {
  if (process.env.DEMO_MODE === "true") return new DemoKnowledgeRepository();
  try {
    return new PostgresKnowledgeRepository(getDb());
  } catch (error) {
    // An explicit production setting must fail closed. With no mode selected,
    // falling back keeps the credential-free walkthrough runnable.
    if (process.env.DEMO_MODE === "false") throw error;
    return new DemoKnowledgeRepository();
  }
}
