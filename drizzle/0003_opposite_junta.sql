ALTER TYPE "public"."claim_state" ADD VALUE 'resolved';--> statement-breakpoint
ALTER TABLE "meeting" ADD COLUMN "trail_id" text DEFAULT 'decision-trail' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_capture" ADD COLUMN "trail_id" text DEFAULT 'decision-trail' NOT NULL;--> statement-breakpoint
ALTER TABLE "utterance" ADD COLUMN "speaker_identity" text;--> statement-breakpoint
ALTER TABLE "utterance" ADD COLUMN "speaker_email" text;--> statement-breakpoint
CREATE INDEX "meeting_trail_id_idx" ON "meeting" USING btree ("trail_id");--> statement-breakpoint
CREATE INDEX "meeting_capture_trail_id_idx" ON "meeting_capture" USING btree ("trail_id");