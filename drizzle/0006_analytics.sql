CREATE TABLE "app_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_events_created_idx" ON "app_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_events_user_idx" ON "app_events" USING btree ("user_id","created_at");