export interface EntityKindTemplate {
  key: string;
  label: string;
  description: string;
  suggestedQuestions: string[];
}

export interface KnowledgeTemplate {
  id: string;
  name: string;
  description: string;
  entityKinds: EntityKindTemplate[];
  claimGuidance: string[];
}

/**
 * Vertical customization belongs here: it changes extraction vocabulary and UI
 * hints without changing the provenance or history model underneath it.
 */
export const neutralTemplate: KnowledgeTemplate = {
  id: "neutral-v1",
  name: "Domain-neutral decision memory",
  description:
    "Tracks requirements, decisions, commitments, risks, people, and initiatives across conversations.",
  entityKinds: [
    {
      key: "requirement",
      label: "Requirement",
      description: "A need whose rationale, scope, or priority can evolve.",
      suggestedQuestions: ["Who asked for this?", "What changed?"],
    },
    {
      key: "decision",
      label: "Decision",
      description: "A choice made in a conversation with supporting context.",
      suggestedQuestions: ["Why was this decided?", "What did it replace?"],
    },
    {
      key: "commitment",
      label: "Commitment",
      description: "An owner, promised action, or target date.",
      suggestedQuestions: ["Who owns this?", "When is it due?"],
    },
    {
      key: "risk",
      label: "Risk",
      description: "A dependency, concern, or unresolved question.",
      suggestedQuestions: ["What is blocked?", "What remains open?"],
    },
    {
      key: "initiative",
      label: "Initiative",
      description: "A body of work discussed across conversations.",
      suggestedQuestions: ["What changed?", "What is blocked?"],
    },
    {
      key: "person",
      label: "Person",
      description: "A participant or person discussed in meetings.",
      suggestedQuestions: ["What have they committed to?"],
    },
    {
      key: "organization",
      label: "Organization",
      description: "A company, team, or group.",
      suggestedQuestions: ["What is the current relationship?"],
    },
  ],
  claimGuidance: [
    "Phrase extracted statements as attributed, falsifiable claims.",
    "Never discard contradictory evidence.",
    "Preserve verbatim evidence with speaker and timestamp.",
    "Mark chronology explicitly when a newer claim supersedes an older one.",
    "Keep requirements, decisions, commitments, and risks distinct even when they refer to the same initiative.",
  ],
};
