import { AppError } from "../errors/app-error";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  precision: number; // e.g. 2 for cents/poisha, 0 for JPY
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  BDT: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", precision: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", precision: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", precision: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", precision: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", precision: 2 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", precision: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", precision: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", precision: 0 },
};

export const DEFAULT_CURRENCY = "BDT";

export interface Money {
  amountMinor: bigint;
  currency: string;
}

export function getCurrencyConfig(currency: string): CurrencyConfig {
  const upper = currency.toUpperCase();
  const config = SUPPORTED_CURRENCIES[upper];
  if (!config) {
    // Default to 2 decimals for unknown standard currencies
    return { code: upper, symbol: upper, name: upper, precision: 2 };
  }
  return config;
}

/**
 * Converts a decimal string or number to integer minor units (bigint).
 * e.g. "125.50" with precision 2 -> 12550n
 */
export function decimalStringToMinor(amount: string | number, currency = DEFAULT_CURRENCY): bigint {
  const config = getCurrencyConfig(currency);
  const cleanStr = String(amount).trim().replace(/,/g, "");

  if (!cleanStr || isNaN(Number(cleanStr))) {
    throw AppError.validation(`Invalid monetary amount: ${amount}`);
  }

  const isNegative = cleanStr.startsWith("-");
  const absStr = isNegative ? cleanStr.slice(1) : cleanStr;

  const parts = absStr.split(".");
  const integerPart = parts[0] || "0";
  let fractionPart = parts[1] || "";

  if (config.precision === 0) {
    fractionPart = "";
  } else {
    fractionPart = fractionPart.slice(0, config.precision).padEnd(config.precision, "0");
  }

  const totalStr = integerPart + fractionPart;
  const minor = BigInt(totalStr);
  return isNegative ? -minor : minor;
}

/**
 * Converts integer minor units (bigint) to standard decimal string.
 * e.g. 12550n with precision 2 -> "125.50"
 */
export function minorToDecimalString(amountMinor: bigint, currency = DEFAULT_CURRENCY): string {
  const config = getCurrencyConfig(currency);
  const isNegative = amountMinor < 0n;
  const abs = isNegative ? -amountMinor : amountMinor;
  const absStr = abs.toString();

  if (config.precision === 0) {
    return (isNegative ? "-" : "") + absStr;
  }

  let formatted: string;
  if (absStr.length <= config.precision) {
    const padded = absStr.padStart(config.precision, "0");
    formatted = `0.${padded}`;
  } else {
    const splitIndex = absStr.length - config.precision;
    const intPart = absStr.slice(0, splitIndex);
    const fracPart = absStr.slice(splitIndex);
    formatted = `${intPart}.${fracPart}`;
  }

  return (isNegative ? "-" : "") + formatted;
}

export function minorToNumber(amountMinor: bigint, currency = DEFAULT_CURRENCY): number {
  return parseFloat(minorToDecimalString(amountMinor, currency));
}

/**
 * Format money with symbol and thousand separators.
 * e.g. 125050n BDT -> "৳1,250.50"
 */
export function formatMoney(
  amountMinor: bigint | number | string,
  currency = DEFAULT_CURRENCY,
  showSymbol = true,
): string {
  const minor = typeof amountMinor === "bigint" ? amountMinor : decimalStringToMinor(amountMinor, currency);
  const config = getCurrencyConfig(currency);
  const decimalStr = minorToDecimalString(minor, currency);
  const isNegative = minor < 0n;
  const absDecimal = isNegative ? decimalStr.slice(1) : decimalStr;

  const [intPart, fracPart] = absDecimal.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fullNum = fracPart ? `${withCommas}.${fracPart}` : withCommas;

  const symbol = showSymbol ? config.symbol : "";
  const sign = isNegative ? "-" : "";

  return `${sign}${symbol}${fullNum}`;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw AppError.validation(`Cannot add amounts of different currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amountMinor: a.amountMinor + b.amountMinor,
    currency: a.currency,
  };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw AppError.validation(`Cannot subtract amounts of different currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amountMinor: a.amountMinor - b.amountMinor,
    currency: a.currency,
  };
}

/**
 * Validates that debit and credit entries balance for each currency within a transaction.
 */
export function validateDoubleEntryBalance(
  entries: Array<{ direction: "DEBIT" | "CREDIT"; amountMinor: bigint; currency: string }>,
): void {
  if (!entries || entries.length < 2) {
    throw AppError.unbalanced("A double-entry transaction must contain at least two entries");
  }

  const currencyTotals = new Map<string, { debits: bigint; credits: bigint }>();

  for (const entry of entries) {
    if (entry.amountMinor <= 0n) {
      throw AppError.validation("Entry amount must be strictly positive");
    }

    const current = currencyTotals.get(entry.currency) || { debits: 0n, credits: 0n };
    if (entry.direction === "DEBIT") {
      current.debits += entry.amountMinor;
    } else {
      current.credits += entry.amountMinor;
    }
    currencyTotals.set(entry.currency, current);
  }

  for (const [curr, totals] of currencyTotals.entries()) {
    if (totals.debits !== totals.credits) {
      throw AppError.unbalanced(
        `Double-entry balance check failed for ${curr}: Debits (${totals.debits}) do not equal Credits (${totals.credits})`,
      );
    }
  }
}
