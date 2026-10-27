CREATE TYPE "public"."external_ledger_kind" AS ENUM('income', 'expense', 'equity');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer', 'loan_given', 'loan_received', 'repayment_received', 'repayment_made', 'adjustment', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."transaction_link_type" AS ENUM('repayment', 'reversal', 'correction');--> statement-breakpoint
CREATE TABLE "financial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigserial NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid,
	"event_type" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"person_id" uuid,
	"external_kind" "external_ledger_kind",
	"direction" "ledger_entry_direction" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_single_target_check" CHECK (num_nonnulls("ledger_entries"."account_id", "ledger_entries"."person_id", "ledger_entries"."external_kind") = 1),
	CONSTRAINT "ledger_entries_amount_positive_check" CHECK ("ledger_entries"."amount_minor" > 0),
	CONSTRAINT "ledger_entries_currency_format_check" CHECK ("ledger_entries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"person_id" uuid,
	"reverses_transaction_id" uuid,
	"reversed_by_transaction_id" uuid,
	"reversed_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_amount_positive_check" CHECK ("ledger_transactions"."amount_minor" > 0),
	CONSTRAINT "ledger_transactions_currency_format_check" CHECK ("ledger_transactions"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "people_name_not_blank_check" CHECK (length(btrim("people"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "tags_name_not_blank_check" CHECK (length(btrim("tags"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "transaction_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_transaction_id" uuid NOT NULL,
	"to_transaction_id" uuid NOT NULL,
	"link_type" "transaction_link_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_reverses_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("reverses_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_reversed_by_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("reversed_by_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_from_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_to_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_sequence_unique" ON "financial_events" USING btree ("sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_user_id_idempotency_key_unique" ON "financial_events" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "financial_events_user_id_sequence_idx" ON "financial_events" USING btree ("user_id","sequence");--> statement-breakpoint
CREATE INDEX "financial_events_transaction_id_idx" ON "financial_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_id_account_id_idx" ON "ledger_entries" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_id_person_id_idx" ON "ledger_entries" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_transactions_user_id_idempotency_key_unique" ON "ledger_transactions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ledger_transactions_user_id_occurred_at_idx" ON "ledger_transactions" USING btree ("user_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "ledger_transactions_user_id_type_idx" ON "ledger_transactions" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "ledger_transactions_user_id_person_id_idx" ON "ledger_transactions" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE INDEX "people_user_id_idx" ON "people" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_normalized_name_unique" ON "tags" USING btree ("user_id","normalized_name");--> statement-breakpoint
CREATE INDEX "tags_user_id_parent_id_idx" ON "tags" USING btree ("user_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_links_unique" ON "transaction_links" USING btree ("from_transaction_id","to_transaction_id","link_type");--> statement-breakpoint
CREATE INDEX "transaction_links_to_transaction_id_idx" ON "transaction_links" USING btree ("to_transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_links_user_id_idx" ON "transaction_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_tags_tag_id_idx" ON "transaction_tags" USING btree ("tag_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_format_check" CHECK ("accounts"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
CREATE OR REPLACE FUNCTION "linked_coin_assert_entry_invariants"() RETURNS trigger AS $$
DECLARE
  tx_user uuid;
  tx_currency text;
  entry_count integer;
  debit_total numeric;
  credit_total numeric;
BEGIN
  SELECT user_id, currency INTO tx_user, tx_currency
    FROM ledger_transactions WHERE id = NEW.transaction_id;

  -- The parent transaction was deleted; the cascading delete removes entries.
  IF tx_user IS NULL THEN
    RETURN NULL;
  END IF;

  IF NEW.user_id <> tx_user THEN
    RAISE EXCEPTION 'ledger entry owner does not match its transaction owner'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.currency <> tx_currency THEN
    RAISE EXCEPTION 'ledger entry currency % does not match transaction currency %', NEW.currency, tx_currency
      USING ERRCODE = '23514';
  END IF;

  IF NEW.account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = NEW.account_id AND user_id = tx_user
  ) THEN
    RAISE EXCEPTION 'ledger entry account does not belong to the transaction owner'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.person_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM people WHERE id = NEW.person_id AND user_id = tx_user
  ) THEN
    RAISE EXCEPTION 'ledger entry person does not belong to the transaction owner'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
         coalesce(sum(amount_minor) FILTER (WHERE direction = 'debit'), 0),
         coalesce(sum(amount_minor) FILTER (WHERE direction = 'credit'), 0)
    INTO entry_count, debit_total, credit_total
    FROM ledger_entries WHERE transaction_id = NEW.transaction_id;

  IF entry_count < 2 THEN
    RAISE EXCEPTION 'ledger transaction % requires at least two entries', NEW.transaction_id
      USING ERRCODE = '23514';
  END IF;

  IF debit_total <> credit_total THEN
    RAISE EXCEPTION 'ledger transaction % is unbalanced: debits %, credits %', NEW.transaction_id, debit_total, credit_total
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "ledger_entries_invariants_check"
  AFTER INSERT OR UPDATE ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "linked_coin_assert_entry_invariants"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "linked_coin_assert_transaction_tag_owner"() RETURNS trigger AS $$
DECLARE
  tx_user uuid;
  tag_user uuid;
BEGIN
  SELECT user_id INTO tx_user FROM ledger_transactions WHERE id = NEW.transaction_id;
  SELECT user_id INTO tag_user FROM tags WHERE id = NEW.tag_id;

  IF tx_user IS NOT NULL AND tag_user IS NOT NULL AND tx_user <> tag_user THEN
    RAISE EXCEPTION 'a transaction may only be tagged with its owner''s tags'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "transaction_tags_owner_check"
  AFTER INSERT OR UPDATE ON "transaction_tags"
  FOR EACH ROW EXECUTE FUNCTION "linked_coin_assert_transaction_tag_owner"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "linked_coin_reject_financial_event_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'financial events are append-only'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "financial_events_append_only"
  BEFORE UPDATE OR DELETE ON "financial_events"
  FOR EACH ROW EXECUTE FUNCTION "linked_coin_reject_financial_event_mutation"();
