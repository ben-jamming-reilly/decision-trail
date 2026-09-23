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
  name: "General conversation intelligence",
  description:
    "Tracks people, initiatives, decisions, risks, and organizations.",
  entityKinds: [
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
  ],
};
