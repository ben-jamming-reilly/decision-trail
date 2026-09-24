CREATE TYPE "public"."capture_status" AS ENUM('scheduled', 'joining', 'waiting_room', 'in_call', 'recording', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "meeting_capture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_url" text NOT NULL,
	"join_at" timestamp with time zone NOT NULL,
	"bot_id" text,
	"status" "capture_status" DEFAULT 'scheduled' NOT NULL,
	"status_detail" text,
	"last_bot_event_at" timestamp with time zone,
	"recording_id" text,
	"transcript_id" text,
	"meeting_id" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_capture" ADD CONSTRAINT "meeting_capture_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_capture_bot_id_uidx" ON "meeting_capture" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "meeting_capture_status_idx" ON "meeting_capture" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_capture_join_at_idx" ON "meeting_capture" USING btree ("join_at");