CREATE TABLE "list_likes" (
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_likes_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
ALTER TABLE "list_likes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_display_name_length" CHECK (char_length("profiles"."display_name") between 1 and 30)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "list_items" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_likes_list_idx" ON "list_likes" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "comments_title_public_idx" ON "comments" USING btree ("title_id","created_at") WHERE "comments"."is_public";--> statement-breakpoint
CREATE INDEX "lists_public_idx" ON "lists" USING btree ("published_at") WHERE "lists"."is_public";--> statement-breakpoint
-- Comments written before sharing existed were written as private notes, so they stay private.
UPDATE "comments" SET "is_public" = false;
