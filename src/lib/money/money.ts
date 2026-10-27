/**
 * Money is always integer minor units (e.g. poisha, cents) plus a currency
 * code. JavaScript floating point is never used for financial arithmetic.
 */

const CURRENCY_PRECISION: Readonly<Record<string, number>> = {
  BDT: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
  PKR: 2,
  LKR: 2,
  NPR: 2,
  CAD: 2,
  AUD: 2,
  SGD: 2,
  MYR: 2,
  AED: 2,
  SAR: 2,
  CNY: 2,
  CHF: 2,
  JPY: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

const MAX_INTEGER_DIGITS = 15;

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_PRECISION).sort();

export function isSupportedCurrency(currency: string): boolean {
  return Object.hasOwn(CURRENCY_PRECISION, currency.toUpperCase());
}

export function currencyPrecision(currency: string): number {
  const precision = CURRENCY_PRECISION[currency.toUpperCase()];

  if (precision === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return precision;
}

/**
 * Parses a positive decimal amount (for example "1250.50") into minor units,
 * returning null when the value is malformed or exceeds the currency's
 * precision.
 */
export function parseAmountToMinor(
  amount: string,
  currency: string,
): bigint | null {
  if (!isSupportedCurrency(currency)) {
    return null;
  }

  const precision = currencyPrecision(currency);
  const trimmed = amount.trim();
  const fraction = precision > 0 ? `(?:\\.\\d{1,${precision}})?` : "";

  if (!new RegExp(`^\\d{1,${MAX_INTEGER_DIGITS}}${fraction}$`).test(trimmed)) {
    return null;
  }

  const [whole = "0", fractional = ""] = trimmed.split(".");
  const paddedFraction = fractional.padEnd(precision, "0");

  return (
    BigInt(whole) * 10n ** BigInt(precision) + BigInt(paddedFraction || "0")
  );
}

/** Formats minor units for display, including thousands separators. */
export function formatMinor(amountMinor: bigint, currency: string): string {
  const precision = currencyPrecision(currency);
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;
  const divisor = 10n ** BigInt(precision);
  const whole = (absolute / divisor).toString();
  const fractional = (absolute % divisor)
    .toString()
    .padStart(precision, "0");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const formatted =
    precision > 0 ? `${groupedWhole}.${fractional}` : groupedWhole;

  return negative ? `-${formatted}` : formatted;
}

export function formatMoney(amountMinor: bigint, currency: string): string {
  return `${formatMinor(amountMinor, currency)} ${currency.toUpperCase()}`;
}
