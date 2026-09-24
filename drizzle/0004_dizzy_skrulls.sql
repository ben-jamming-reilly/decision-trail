ALTER TABLE "claim" ADD COLUMN "trail_id" text DEFAULT 'decision-trail' NOT NULL;--> statement-breakpoint
CREATE INDEX "claim_trail_id_idx" ON "claim" USING btree ("trail_id");