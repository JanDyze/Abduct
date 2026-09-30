ALTER TABLE "lists" ADD COLUMN "icon" text DEFAULT 'watchlist' NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "color" text DEFAULT 'orange' NOT NULL;--> statement-breakpoint
-- Lists made with an emoji cover get the icon closest to it.
UPDATE "lists" SET "icon" = CASE "emoji"
  WHEN '🍿' THEN 'popcorn'
  WHEN '🎬' THEN 'movie-night'
  WHEN '💞' THEN 'date-night'
  WHEN '👻' THEN 'horror'
  WHEN '🍥' THEN 'animation'
  WHEN '📺' THEN 'watchlist'
  WHEN '🌙' THEN 'late-night'
  WHEN '🔥' THEN 'action'
  ELSE "icon" END
WHERE "emoji" IS NOT NULL;
