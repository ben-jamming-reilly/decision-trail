export type ClaimState = "active" | "superseded" | "disputed";

export interface Evidence {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  speaker: string;
  startSeconds: number;
  endSeconds: number;
  quote: string;
}

export interface Claim {
  id: string;
  text: string;
  state: ClaimState;
  confidence: number;
  recordedAt: string;
  supersedesClaimId?: string;
  evidence: Evidence[];
}

export interface EntitySummary {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string;
  claimCount: number;
  activeClaimCount: number;
  updatedAt: string;
}

export interface Entity extends EntitySummary {
  aliases: string[];
  claims: Claim[];
}

export interface Utterance {
  id: string;
  speaker: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface MeetingSummary {
  id: string;
  title: string;
  startedAt: string;
  participants: string[];
  source: "recall";
  recallBotId?: string;
  utteranceCount: number;
}

export interface Meeting extends MeetingSummary {
  utterances: Utterance[];
}

export interface KnowledgeStats {
  entities: number;
  meetings: number;
  claims: number;
  evidenceLinks: number;
}

export interface QueryResult {
  entity: EntitySummary;
  claim: Claim;
  score: number;
}
