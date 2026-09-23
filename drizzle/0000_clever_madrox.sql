CREATE TYPE "public"."claim_state" AS ENUM('active', 'superseded', 'disputed');--> statement-breakpoint
CREATE TABLE "claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"text" text NOT NULL,
	"state" "claim_state" DEFAULT 'active' NOT NULL,
	"confidence" real NOT NULL,
	"supersedes_claim_id" uuid,
	"template_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_confidence_range_check" CHECK ("claim"."confidence" >= 0 and "claim"."confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"claim_id" uuid NOT NULL,
	"utterance_id" uuid NOT NULL,
	CONSTRAINT "claim_evidence_claim_id_utterance_id_pk" PRIMARY KEY("claim_id","utterance_id")
);
--> statement-breakpoint
CREATE TABLE "claim_transition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"from_state" "claim_state",
	"to_state" "claim_state" NOT NULL,
	"reason" text NOT NULL,
	"meeting_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'recall' NOT NULL,
	"recall_bot_id" text,
	"recall_recording_id" text,
	"recall_transcript_id" text NOT NULL,
	"participants" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utterance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"speaker" text NOT NULL,
	"start_seconds" real NOT NULL,
	"end_seconds" real NOT NULL,
	"text" text NOT NULL,
	"ordinal" real NOT NULL,
	"raw" jsonb,
	CONSTRAINT "utterance_time_order_check" CHECK ("utterance"."end_seconds" >= "utterance"."start_seconds")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_utterance_id_utterance_id_fk" FOREIGN KEY ("utterance_id") REFERENCES "public"."utterance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_transition" ADD CONSTRAINT "claim_transition_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_transition" ADD CONSTRAINT "claim_transition_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterance" ADD CONSTRAINT "utterance_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_entity_id_idx" ON "claim" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "claim_state_idx" ON "claim" USING btree ("state");--> statement-breakpoint
CREATE INDEX "claim_evidence_utterance_id_idx" ON "claim_evidence" USING btree ("utterance_id");--> statement-breakpoint
CREATE INDEX "claim_transition_claim_id_idx" ON "claim_transition" USING btree ("claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_slug_uidx" ON "entity" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "entity_kind_idx" ON "entity" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_recall_transcript_id_uidx" ON "meeting" USING btree ("recall_transcript_id");--> statement-breakpoint
CREATE INDEX "meeting_started_at_idx" ON "meeting" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "utterance_meeting_ordinal_uidx" ON "utterance" USING btree ("meeting_id","ordinal");--> statement-breakpoint
CREATE INDEX "utterance_meeting_id_idx" ON "utterance" USING btree ("meeting_id");