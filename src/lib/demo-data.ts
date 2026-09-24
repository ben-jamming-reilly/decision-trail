import type { Entity, Meeting } from "@/lib/domain";

export const demoMeetings: Meeting[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Enterprise customer discovery",
    startedAt: "2026-01-12T17:00:00.000Z",
    participants: ["Elena Park", "Maya Chen", "Priya Rao"],
    source: "recall",
    recallBotId: "demo-bot-001",
    utteranceCount: 3,
    utterances: [
      {
        id: "u1",
        speaker: "Elena Park",
        startSeconds: 184,
        endSeconds: 198,
        text: "Our admins need a workspace-level bulk export for audits and employee offboarding.",
      },
      {
        id: "u2",
        speaker: "Elena Park",
        startSeconds: 241,
        endSeconds: 254,
        text: "Without a complete export, our security review will block the enterprise expansion.",
      },
      {
        id: "u3",
        speaker: "Maya Chen",
        startSeconds: 412,
        endSeconds: 425,
        text: "I am marking bulk export as an enterprise requirement and will bring a scoped proposal to planning.",
      },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Bulk export product planning",
    startedAt: "2026-02-03T18:30:00.000Z",
    participants: ["Maya Chen", "Jon Bell", "Priya Rao"],
    source: "recall",
    recallBotId: "demo-bot-002",
    utteranceCount: 3,
    utterances: [
      {
        id: "u4",
        speaker: "Maya Chen",
        startSeconds: 95,
        endSeconds: 111,
        text: "For V1, workspace admins can export all records as CSV; schedules and custom formats can wait.",
      },
      {
        id: "u5",
        speaker: "Priya Rao",
        startSeconds: 132,
        endSeconds: 145,
        text: "I will own the product rollout, with March 15 as the initial target date.",
      },
      {
        id: "u6",
        speaker: "Jon Bell",
        startSeconds: 380,
        endSeconds: 393,
        text: "The March 15 target assumes our existing admin permissions are sufficient for export.",
      },
    ],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Bulk export engineering review",
    startedAt: "2026-02-18T16:00:00.000Z",
    participants: ["Jon Bell", "Maya Chen", "Sam Ortiz"],
    source: "recall",
    recallBotId: "demo-bot-003",
    utteranceCount: 3,
    utterances: [
      {
        id: "u7",
        speaker: "Jon Bell",
        startSeconds: 205,
        endSeconds: 221,
        text: "Export can expose restricted project data unless we add permission-aware filtering, so March 15 is no longer safe.",
      },
      {
        id: "u8",
        speaker: "Maya Chen",
        startSeconds: 298,
        endSeconds: 313,
        text: "Move the target date to April 2. Sam owns permission-aware filtering, and Priya remains rollout owner.",
      },
      {
        id: "u9",
        speaker: "Sam Ortiz",
        startSeconds: 352,
        endSeconds: 365,
        text: "I can own filtering, but audit logging remains an open security question.",
      },
    ],
  },
];

const evidence = (id: string, meetingIndex: number, utteranceIndex: number) => {
  const meeting = demoMeetings[meetingIndex];
  const utterance = meeting.utterances[utteranceIndex];
  return {
    id,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingDate: meeting.startedAt,
    speaker: utterance.speaker,
    startSeconds: utterance.startSeconds,
    endSeconds: utterance.endSeconds,
    quote: utterance.text,
  };
};

export const demoEntities: Entity[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "enterprise-bulk-export",
    name: "Enterprise bulk export",
    kind: "requirement",
    description:
      "A customer-driven enterprise requirement whose scope and target date evolved across discovery, planning, and engineering.",
    aliases: ["bulk export", "enterprise export", "CSV export"],
    claimCount: 5,
    activeClaimCount: 3,
    updatedAt: "2026-02-18T16:05:00.000Z",
    claims: [
      {
        id: "c1",
        text: "The bulk export launch was delayed from March 15 to April 2 because permission-aware filtering is required.",
        state: "active",
        confidence: 0.99,
        recordedAt: "2026-02-18T16:04:58.000Z",
        supersedesClaimId: "c2",
        evidence: [evidence("e1", 2, 0), evidence("e2", 2, 1)],
      },
      {
        id: "c2",
        text: "The initial target date for the V1 bulk export launch was March 15.",
        state: "superseded",
        confidence: 0.98,
        recordedAt: "2026-02-03T18:32:12.000Z",
        evidence: [evidence("e3", 1, 1)],
      },
      {
        id: "c3",
        text: "Existing admin permissions are sufficient for a safe bulk export.",
        state: "disputed",
        confidence: 0.92,
        recordedAt: "2026-02-03T18:36:20.000Z",
        evidence: [evidence("e4", 1, 2), evidence("e5", 2, 0)],
      },
      {
        id: "c4",
        text: "V1 will let workspace admins export all records as CSV; schedules and custom formats are out of scope.",
        state: "active",
        confidence: 0.98,
        recordedAt: "2026-02-03T18:31:35.000Z",
        evidence: [evidence("e6", 1, 0)],
      },
      {
        id: "c5",
        text: "Customer conversations established workspace-level bulk export as an enterprise requirement for audits and offboarding.",
        state: "active",
        confidence: 0.99,
        recordedAt: "2026-01-12T17:06:52.000Z",
        evidence: [
          evidence("e7", 0, 0),
          evidence("e8", 0, 1),
          evidence("e9", 0, 2),
        ],
      },
    ],
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    slug: "permission-aware-export",
    name: "Permission-aware export",
    kind: "risk",
    description:
      "The security dependency that changed the bulk export plan and launch date.",
    aliases: ["permissions", "filtering", "security dependency"],
    claimCount: 3,
    activeClaimCount: 2,
    updatedAt: "2026-02-18T16:05:00.000Z",
    claims: [
      {
        id: "c6",
        text: "Permission-aware filtering is required to prevent exports from exposing restricted project data.",
        state: "active",
        confidence: 0.99,
        recordedAt: "2026-02-18T16:03:25.000Z",
        supersedesClaimId: "c8",
        evidence: [evidence("e10", 2, 0)],
      },
      {
        id: "c7",
        text: "Audit logging for bulk exports remains an open security question.",
        state: "active",
        confidence: 0.97,
        recordedAt: "2026-02-18T16:05:52.000Z",
        evidence: [evidence("e11", 2, 2)],
      },
      {
        id: "c8",
        text: "No new permission work would be needed for the V1 bulk export.",
        state: "superseded",
        confidence: 0.82,
        recordedAt: "2026-02-03T18:36:20.000Z",
        evidence: [evidence("e12", 1, 2), evidence("e13", 2, 0)],
      },
    ],
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    slug: "bulk-export-ownership",
    name: "Bulk export ownership",
    kind: "commitment",
    description:
      "Current owners for the product rollout and its security dependency.",
    aliases: ["owners", "commitments", "Priya", "Sam"],
    claimCount: 2,
    activeClaimCount: 2,
    updatedAt: "2026-02-18T16:05:00.000Z",
    claims: [
      {
        id: "c9",
        text: "Priya Rao owns the bulk export product rollout.",
        state: "active",
        confidence: 0.99,
        recordedAt: "2026-02-18T16:04:58.000Z",
        evidence: [evidence("e14", 1, 1), evidence("e15", 2, 1)],
      },
      {
        id: "c10",
        text: "Sam Ortiz owns permission-aware filtering for bulk export.",
        state: "active",
        confidence: 0.99,
        recordedAt: "2026-02-18T16:04:58.000Z",
        evidence: [evidence("e16", 2, 1), evidence("e17", 2, 2)],
      },
    ],
  },
];
