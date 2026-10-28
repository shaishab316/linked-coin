CREATE TABLE IF NOT EXISTS "person_tags" (
	"person_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "person_tags_person_id_tag_id_pk" PRIMARY KEY("person_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_tags" (
	"account_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "account_tags_account_id_tag_id_pk" PRIMARY KEY("account_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_currency_format_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "ledger_entries_single_target_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "ledger_entries_amount_positive_check";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "ledger_entries_currency_format_check";--> statement-breakpoint
ALTER TABLE "ledger_transactions" DROP CONSTRAINT IF EXISTS "ledger_transactions_amount_positive_check";--> statement-breakpoint
ALTER TABLE "ledger_transactions" DROP CONSTRAINT IF EXISTS "ledger_transactions_currency_format_check";--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT IF EXISTS "people_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "financial_events" DROP CONSTRAINT IF EXISTS "financial_events_transaction_id_ledger_transactions_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "tags_user_id_normalized_name_unique";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "account_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_entries" ALTER COLUMN "external_kind" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_entries" ALTER COLUMN "direction" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transaction_links" ALTER COLUMN "link_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "tag_type" text DEFAULT 'transaction' NOT NULL;--> statement-breakpoint
ALTER TABLE "person_tags" DROP CONSTRAINT IF EXISTS "person_tags_person_id_people_id_fk";--> statement-breakpoint
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_tags" DROP CONSTRAINT IF EXISTS "person_tags_tag_id_tags_id_fk";--> statement-breakpoint
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" DROP CONSTRAINT IF EXISTS "account_tags_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" DROP CONSTRAINT IF EXISTS "account_tags_tag_id_tags_id_fk";--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "person_tags_tag_id_idx" ON "person_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_tags_tag_id_idx" ON "account_tags" USING btree ("tag_id");--> statement-breakpoint
ALTER TABLE "financial_events" DROP CONSTRAINT IF EXISTS "financial_events_transaction_id_ledger_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_id_normalized_name_type_unique" ON "tags" USING btree ("user_id","normalized_name","tag_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_user_id_tag_type_idx" ON "tags" USING btree ("user_id","tag_type");--> statement-breakpoint
DROP TYPE IF EXISTS "public"."account_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."external_ledger_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ledger_entry_direction";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."transaction_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."transaction_link_type";