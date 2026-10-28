CREATE TABLE IF NOT EXISTS "shared_person_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"token" text NOT NULL,
	"label" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_person_links" ADD CONSTRAINT "shared_person_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_person_links" ADD CONSTRAINT "shared_person_links_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shared_person_links_token_unique" ON "shared_person_links" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_person_links_user_person_idx" ON "shared_person_links" USING btree ("user_id", "person_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_person_links_person_id_idx" ON "shared_person_links" USING btree ("person_id");
