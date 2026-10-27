import { describe, expect, it } from "vitest";

import {
  currencyPrecision,
  formatMinor,
  formatMoney,
  isSupportedCurrency,
  parseAmountToMinor,
} from "./money";

describe("parseAmountToMinor", () => {
  it("parses two-decimal currencies exactly", () => {
    expect(parseAmountToMinor("12.5", "BDT")).toBe(1250n);
    expect(parseAmountToMinor("0.01", "USD")).toBe(1n);
    expect(parseAmountToMinor("100", "USD")).toBe(10000n);
  });

  it("avoids binary floating point error", () => {
    expect(parseAmountToMinor("0.1", "USD")).toBe(10n);
    expect(parseAmountToMinor("0.2", "USD")).toBe(20n);
    expect(
      (parseAmountToMinor("0.1", "USD") ?? 0n) +
        (parseAmountToMinor("0.2", "USD") ?? 0n),
    ).toBe(30n);
  });

  it("honours zero-decimal currencies", () => {
    expect(currencyPrecision("JPY")).toBe(0);
    expect(parseAmountToMinor("500", "JPY")).toBe(500n);
    expect(parseAmountToMinor("500.5", "JPY")).toBeNull();
  });

  it("honours three-decimal currencies", () => {
    expect(parseAmountToMinor("1.234", "KWD")).toBe(1234n);
    expect(parseAmountToMinor("1.2345", "KWD")).toBeNull();
  });

  it("rejects malformed or unsupported input", () => {
    for (const value of ["", "-5", "1,000", "1.234", "abc", "1e5", " 1.2.3 "]) {
      expect(parseAmountToMinor(value, "USD")).toBeNull();
    }

    expect(parseAmountToMinor("10", "XYZ")).toBeNull();
  });

  it("rejects overly large amounts", () => {
    expect(parseAmountToMinor("1".repeat(16), "USD")).toBeNull();
    expect(parseAmountToMinor("999999999999999.99", "USD")).toBe(
      99999999999999999n,
    );
  });
});

describe("formatMinor", () => {
  it("formats minor units with separators and precision", () => {
    expect(formatMinor(123456789n, "USD")).toBe("1,234,567.89");
    expect(formatMinor(1250n, "BDT")).toBe("12.50");
    expect(formatMinor(500n, "JPY")).toBe("500");
    expect(formatMinor(0n, "USD")).toBe("0.00");
  });

  it("keeps negative amounts readable", () => {
    expect(formatMinor(-1250n, "USD")).toBe("-12.50");
    expect(formatMoney(-500n, "bdt")).toBe("-5.00 BDT");
  });

  it("round-trips through parsing", () => {
    const minor = parseAmountToMinor("98,765.43".replace(",", ""), "USD");
    expect(minor).toBe(9876543n);
    expect(formatMinor(minor ?? 0n, "USD")).toBe("98,765.43");
  });
});

describe("currency support", () => {
  it("recognizes supported codes case-insensitively", () => {
    expect(isSupportedCurrency("usd")).toBe(true);
    expect(isSupportedCurrency("XYZ")).toBe(false);
  });

  it("rejects unknown currencies", () => {
    expect(() => currencyPrecision("XYZ")).toThrow(/Unsupported currency/);
  });
});
