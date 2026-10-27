import type { ComponentProps, ReactNode } from "react";

const inputClassName =
  "w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

type FormFieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & Omit<ComponentProps<"input">, "name" | "id" | "className">;

export function FormField({ label, name, error, hint, ...inputProps }: FormFieldProps) {
  const describedBy = error
    ? `${name}-error`
    : hint
      ? `${name}-hint`
      : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClassName}
        {...inputProps}
      />
      {hint ? (
        <p id={`${name}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
  variant = "primary",
}: {
  pending: boolean;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const variantClassName =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-strong"
      : "border border-border-subtle bg-white text-ink hover:bg-surface-muted";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClassName}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
