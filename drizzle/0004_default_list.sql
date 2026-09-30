ALTER TABLE "lists" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "lists_one_default_idx" ON "lists" USING btree ("user_id") WHERE "lists"."is_default";--> statement-breakpoint
-- Everyone who already has lists: their first one (the Watchlist, unless they deleted it) becomes the default.
UPDATE "lists" SET "is_default" = true
WHERE "id" IN (SELECT DISTINCT ON ("user_id") "id" FROM "lists" ORDER BY "user_id", "position", "created_at");
