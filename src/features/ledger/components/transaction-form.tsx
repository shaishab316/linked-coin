"use client";

import { useActionState, useState } from "react";

import { FormAlert, FormField, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { SUPPORTED_CURRENCIES } from "@/lib/money/money";

import { createTransactionAction } from "../actions";
import {
  COMMAND_TYPE_LABELS,
  COMMAND_TYPES,
  type CommandType,
} from "../validation";
import type { FormState } from "@/lib/errors/app-error";

export type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

export type PersonOption = {
  id: string;
  name: string;
};

export type TagOption = {
  id: string;
  name: string;
};

export type LoanOptionData = {
  id: string;
  kind: "given" | "received";
  personId: string;
  personName: string;
  label: string;
};

const ACCOUNT_TYPES = new Set<CommandType>([
  "income",
  "expense",
  "transfer",
  "loan_given",
  "loan_received",
  "repayment_received",
  "repayment_made",
  "adjustment",
]);

const PERSON_TYPES = new Set<CommandType>([
  "loan_given",
  "loan_received",
  "repayment_received",
  "repayment_made",
]);

export function TransactionForm({
  accounts,
  people,
  tags,
  loans,
  defaultType,
  defaultCurrency,
  defaultOccurredAt,
  idempotencyKey,
}: {
  accounts: AccountOption[];
  people: PersonOption[];
  tags: TagOption[];
  loans: LoanOptionData[];
  defaultType: CommandType;
  defaultCurrency: string;
  defaultOccurredAt: string;
  idempotencyKey: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTransactionAction,
    undefined,
  );

  const [type, setType] = useState<CommandType>(defaultType);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [personId, setPersonId] = useState("");

  const matchingAccounts = accounts.filter(
    (account) => account.currency === currency,
  );
  const needsPerson = PERSON_TYPES.has(type);
  const needsAccount = ACCOUNT_TYPES.has(type);
  const needsLoan =
    type === "repayment_received" || type === "repayment_made";

  const loanKind = type === "repayment_received" ? "given" : "received";
  const matchingLoans = loans.filter(
    (loan) => loan.kind === loanKind && (!personId || loan.personId === personId),
  );

  const fieldError = (field: string) => state?.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <FormAlert message={state.error} /> : null}

      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <SelectField
        label="Type"
        name="type"
        value={type}
        onChange={(event) => setType(event.target.value as CommandType)}
        error={fieldError("type")}
      >
        {COMMAND_TYPES.map((option) => (
          <option key={option} value={option}>
            {COMMAND_TYPE_LABELS[option]}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          required
          error={fieldError("amount")}
        />

        <SelectField
          label="Currency"
          name="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          error={fieldError("currency")}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
      </div>

      <FormField
        label="Date and time (UTC)"
        name="occurredAt"
        type="datetime-local"
        defaultValue={defaultOccurredAt}
        required
        error={fieldError("occurredAt")}
      />

      <FormField
        label="Description"
        name="description"
        maxLength={200}
        autoComplete="off"
        placeholder="Groceries, salary, rent…"
        required
        error={fieldError("description")}
      />

      {needsAccount ? (
        <SelectField
          label={type === "transfer" ? "From account" : "Account"}
          name={type === "transfer" ? "fromAccountId" : "accountId"}
          required
          error={fieldError(type === "transfer" ? "fromAccountId" : "accountId")}
        >
          <option value="">Choose an account</option>
          {matchingAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      {type === "transfer" ? (
        <SelectField
          label="To account"
          name="toAccountId"
          required
          error={fieldError("toAccountId")}
        >
          <option value="">Choose an account</option>
          {matchingAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      {matchingAccounts.length === 0 ? (
        <p className="text-xs text-danger">
          No active {currency} accounts exist. Create one first.
        </p>
      ) : null}

      {needsPerson ? (
        <SelectField
          label="Person"
          name="personId"
          required
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
          error={fieldError("personId")}
        >
          <option value="">Choose a person</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      {needsLoan ? (
        <SelectField
          label="Link to loan (optional)"
          name="loanTransactionId"
          hint="Linking prevents repaying more than the outstanding amount."
          error={fieldError("loanTransactionId")}
        >
          <option value="">Not linked</option>
          {matchingLoans.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.label}
            </option>
          ))}
        </SelectField>
      ) : null}

      {tags.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Tags</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-xs"
              >
                <input type="checkbox" name="tagIds" value={tag.id} />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <TextareaField
        label="Notes (optional)"
        name="notes"
        maxLength={1000}
        error={fieldError("notes")}
      />

      <SubmitButton pending={pending}>Save transaction</SubmitButton>
    </form>
  );
}
