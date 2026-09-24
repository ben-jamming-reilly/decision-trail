import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const claimState = pgEnum("claim_state", [
  "active",
  "superseded",
  "disputed",
  "resolved",
]);

export const captureStatus = pgEnum("capture_status", [
  "scheduled",
  "joining",
  "waiting_room",
  "in_call",
  "recording",
  "processing",
  "ready",
  "failed",
]);

export const meeting = pgTable(
  "meeting",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trailId: text("trail_id").default("decision-trail").notNull(),
    title: text("title").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    source: text("source").default("recall").notNull(),
    recallBotId: text("recall_bot_id"),
    recallRecordingId: text("recall_recording_id"),
    recallTranscriptId: text("recall_transcript_id").notNull(),
    participants: text("participants").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("meeting_recall_transcript_id_uidx").on(
      table.recallTranscriptId,
    ),
    index("meeting_started_at_idx").on(table.startedAt),
    index("meeting_trail_id_idx").on(table.trailId),
  ],
);

export const meetingCapture = pgTable(
  "meeting_capture",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trailId: text("trail_id").default("decision-trail").notNull(),
    title: text("title").notNull(),
    meetingUrl: text("meeting_url").notNull(),
    joinAt: timestamp("join_at", { withTimezone: true }).notNull(),
    botId: text("bot_id"),
    status: captureStatus("status").default("scheduled").notNull(),
    statusDetail: text("status_detail"),
    lastBotEventAt: timestamp("last_bot_event_at", { withTimezone: true }),
    recordingId: text("recording_id"),
    transcriptId: text("transcript_id"),
    meetingId: uuid("meeting_id").references(() => meeting.id, {
      onDelete: "set null",
    }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("meeting_capture_bot_id_uidx").on(table.botId),
    index("meeting_capture_status_idx").on(table.status),
    index("meeting_capture_join_at_idx").on(table.joinAt),
    index("meeting_capture_trail_id_idx").on(table.trailId),
  ],
);

export const utterance = pgTable(
  "utterance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    speaker: text("speaker").notNull(),
    speakerIdentity: text("speaker_identity"),
    speakerEmail: text("speaker_email"),
    startSeconds: real("start_seconds").notNull(),
    endSeconds: real("end_seconds").notNull(),
    text: text("text").notNull(),
    ordinal: real("ordinal").notNull(),
    raw: jsonb("raw"),
  },
  (table) => [
    uniqueIndex("utterance_meeting_ordinal_uidx").on(
      table.meetingId,
      table.ordinal,
    ),
    index("utterance_meeting_id_idx").on(table.meetingId),
    check(
      "utterance_time_order_check",
      sql`${table.endSeconds} >= ${table.startSeconds}`,
    ),
  ],
);

export const entity = pgTable(
  "entity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    description: text("description").default("").notNull(),
    aliases: text("aliases").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("entity_slug_uidx").on(table.slug),
    index("entity_kind_idx").on(table.kind),
  ],
);

export const claim = pgTable(
  "claim",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trailId: text("trail_id").default("decision-trail").notNull(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    state: claimState("state").default("active").notNull(),
    confidence: real("confidence").notNull(),
    supersedesClaimId: uuid("supersedes_claim_id").references(
      (): AnyPgColumn => claim.id,
      { onDelete: "set null" },
    ),
    templateId: text("template_id").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("claim_entity_id_idx").on(table.entityId),
    index("claim_state_idx").on(table.state),
    index("claim_trail_id_idx").on(table.trailId),
    check(
      "claim_confidence_range_check",
      sql`${table.confidence} >= 0 and ${table.confidence} <= 1`,
    ),
  ],
);

export const claimEvidence = pgTable(
  "claim_evidence",
  {
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    utteranceId: uuid("utterance_id")
      .notNull()
      .references(() => utterance.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.claimId, table.utteranceId] }),
    index("claim_evidence_utterance_id_idx").on(table.utteranceId),
  ],
);

export const claimTransition = pgTable(
  "claim_transition",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    fromState: claimState("from_state"),
    toState: claimState("to_state").notNull(),
    reason: text("reason").notNull(),
    meetingId: uuid("meeting_id").references(() => meeting.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("claim_transition_claim_id_idx").on(table.claimId)],
);

export const webhookEvent = pgTable("webhook_event", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

export const knowledgeTemplate = pgTable("knowledge_template", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MeetingRow = typeof meeting.$inferSelect;
export type MeetingCaptureRow = typeof meetingCapture.$inferSelect;
export type EntityRow = typeof entity.$inferSelect;
export type ClaimRow = typeof claim.$inferSelect;
