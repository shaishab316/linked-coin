import { describe, it, expect } from "vitest";
import {
  decimalStringToMinor,
  minorToDecimalString,
  formatMoney,
  addMoney,
  subtractMoney,
  validateDoubleEntryBalance,
} from "./money";

describe("Money arithmetic & double-entry validation", () => {
  it("converts decimal strings to integer minor units correctly", () => {
    expect(decimalStringToMinor("125.50", "BDT")).toBe(12550n);
    expect(decimalStringToMinor("1000", "BDT")).toBe(100000n);
    expect(decimalStringToMinor("0.05", "USD")).toBe(5n);
    expect(decimalStringToMinor("-50.25", "USD")).toBe(-5025n);
    expect(decimalStringToMinor("500", "JPY")).toBe(500n);
  });

  it("converts minor units back to decimal string correctly", () => {
    expect(minorToDecimalString(12550n, "BDT")).toBe("125.50");
    expect(minorToDecimalString(5n, "USD")).toBe("0.05");
    expect(minorToDecimalString(100000n, "BDT")).toBe("1000.00");
    expect(minorToDecimalString(-5025n, "USD")).toBe("-50.25");
    expect(minorToDecimalString(500n, "JPY")).toBe("500");
  });

  it("formats money nicely with symbols and commas", () => {
    expect(formatMoney(1255000n, "BDT")).toBe("৳12,550.00");
    expect(formatMoney(-50000n, "USD")).toBe("-$500.00");
    expect(formatMoney(1000n, "JPY")).toBe("¥1,000");
  });

  it("adds and subtracts without floating point drift", () => {
    const a = { amountMinor: 1000n, currency: "USD" };
    const b = { amountMinor: 2000n, currency: "USD" };
    expect(addMoney(a, b)).toEqual({ amountMinor: 3000n, currency: "USD" });
    expect(subtractMoney(b, a)).toEqual({ amountMinor: 1000n, currency: "USD" });
  });

  it("validates double-entry balancing invariant", () => {
    // Balanced
    expect(() =>
      validateDoubleEntryBalance([
        { direction: "DEBIT", amountMinor: 5000n, currency: "BDT" },
        { direction: "CREDIT", amountMinor: 5000n, currency: "BDT" },
      ]),
    ).not.toThrow();

    // Multi-leg balanced
    expect(() =>
      validateDoubleEntryBalance([
        { direction: "DEBIT", amountMinor: 5000n, currency: "BDT" },
        { direction: "CREDIT", amountMinor: 3000n, currency: "BDT" },
        { direction: "CREDIT", amountMinor: 2000n, currency: "BDT" },
      ]),
    ).not.toThrow();

    // Unbalanced throws error
    expect(() =>
      validateDoubleEntryBalance([
        { direction: "DEBIT", amountMinor: 5000n, currency: "BDT" },
        { direction: "CREDIT", amountMinor: 4999n, currency: "BDT" },
      ]),
    ).toThrow(/balance check failed/i);
  });
});
