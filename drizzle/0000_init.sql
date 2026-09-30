CREATE TYPE "public"."title_kind" AS ENUM('movie', 'series', 'anime');--> statement-breakpoint
CREATE TYPE "public"."title_source" AS ENUM('tmdb', 'anilist', 'manual');--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"watched_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lists_name_length" CHECK (char_length("lists"."name") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"list_id" uuid,
	"accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "picks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "title_source" NOT NULL,
	"source_id" text NOT NULL,
	"kind" "title_kind" NOT NULL,
	"name" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"overview" text,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"runtime" integer,
	"episodes" integer,
	"score" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_title_idx" ON "list_items" USING btree ("list_id","title_id");--> statement-breakpoint
CREATE INDEX "list_items_user_idx" ON "list_items" USING btree ("user_id","added_at");--> statement-breakpoint
CREATE INDEX "lists_user_idx" ON "lists" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "picks_user_idx" ON "picks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_source_idx" ON "titles" USING btree ("source","source_id");