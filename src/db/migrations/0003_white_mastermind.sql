CREATE TABLE "person_tags" (
	"person_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "person_tags_person_id_tag_id_pk" PRIMARY KEY("person_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "account_tags" (
	"account_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "account_tags_account_id_tag_id_pk" PRIMARY KEY("account_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "sync_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"last_sync_cursor" bigint DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"query_ast" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_currency_format_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_single_target_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_amount_positive_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_currency_format_check";--> statement-breakpoint
ALTER TABLE "ledger_transactions" DROP CONSTRAINT "ledger_transactions_amount_positive_check";--> statement-breakpoint
ALTER TABLE "ledger_transactions" DROP CONSTRAINT "ledger_transactions_currency_format_check";--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "financial_events" DROP CONSTRAINT "financial_events_transaction_id_ledger_transactions_id_fk";
--> statement-breakpoint
DROP INDEX "tags_user_id_normalized_name_unique";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "account_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_entries" ALTER COLUMN "external_kind" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_entries" ALTER COLUMN "direction" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transaction_links" ALTER COLUMN "link_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "tag_type" text DEFAULT 'transaction' NOT NULL;--> statement-breakpoint
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_devices" ADD CONSTRAINT "sync_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_tags_tag_id_idx" ON "person_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "account_tags_tag_id_idx" ON "account_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_devices_user_device_idx" ON "sync_devices" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "saved_queries_user_id_idx" ON "saved_queries" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_normalized_name_type_unique" ON "tags" USING btree ("user_id","normalized_name","tag_type");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_tag_type_idx" ON "tags" USING btree ("user_id","tag_type");--> statement-breakpoint
DROP TYPE "public"."account_type";--> statement-breakpoint
DROP TYPE "public"."external_ledger_kind";--> statement-breakpoint
DROP TYPE "public"."ledger_entry_direction";--> statement-breakpoint
DROP TYPE "public"."transaction_type";--> statement-breakpoint
DROP TYPE "public"."transaction_link_type";