import { en, type Dictionary } from "./dictionaries/en";
import { bn } from "./dictionaries/bn";

export type { Dictionary };
export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isValidLocale(locale: string | undefined): locale is Locale {
  return typeof locale === "string" && (LOCALES as readonly string[]).includes(locale);
}

export function getDictionary(locale: string | undefined): Dictionary {
  if (locale === "bn") return bn;
  return en;
}

const BANGLA_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export function toBanglaDigits(input: string | number | bigint): string {
  const str = input.toString();
  return str.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit] || digit);
}

export function formatLocalizedAmount(
  amountMinor: bigint,
  currency: string,
  locale: Locale,
  forcedSign?: "+" | "-" | "" | boolean,
): string {
  const isNegative = amountMinor < 0n;
  const absMinor = isNegative ? -amountMinor : amountMinor;
  const major = absMinor / 100n;
  const minor = absMinor % 100n;
  const minorStr = minor.toString().padStart(2, "0");
  const rawFormatted = `${major.toLocaleString("en-US")}.${minorStr}`;

  const safeCurrency = currency && currency !== "-" ? currency.toUpperCase() : "BDT";
  const symbol = safeCurrency === "BDT" ? "৳" : safeCurrency === "USD" ? "$" : safeCurrency === "EUR" ? "€" : `${safeCurrency} `;

  let sign = "";
  if (typeof forcedSign === "string") {
    sign = forcedSign;
  } else if (forcedSign === true) {
    sign = isNegative ? "-" : "+";
  } else if (forcedSign === false) {
    sign = "";
  } else {
    sign = isNegative ? "-" : "";
  }

  // Ensure sign doesn't clash with symbol or produce double minuses
  const cleanSign = sign === "-" || sign === "+" ? sign : "";
  const banglaNum = toBanglaDigits(rawFormatted);
  const formattedNum = locale === "bn" ? banglaNum : rawFormatted;

  return `${cleanSign}${symbol}${formattedNum}`;
}
