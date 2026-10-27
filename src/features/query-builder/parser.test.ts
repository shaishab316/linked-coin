import { describe, it, expect } from "vitest";
import { parseQueryString, astToChips } from "./parser";

describe("Query String Parser and AST Chips", () => {
  it("parses complex search strings with tokens into typed AST", () => {
    const query =
      "tag:Food account:Cash amount:>500 type:expense date:2026-01-01..2026-01-31 Dinner with team";
    const ast = parseQueryString(query);

    expect(ast.date).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(ast.transactionTypes).toEqual(["expense"]);
    expect(ast.amount).toEqual({ min: "500" });
    expect(ast.text).toBe("Dinner with team");
  });

  it("handles exact dates and range amounts", () => {
    const query = "date:2026-05-15 amount:100..500 currency:USD";
    const ast = parseQueryString(query);

    expect(ast.date).toEqual({ from: "2026-05-15", to: "2026-05-15" });
    expect(ast.amount).toEqual({ min: "100", max: "500" });
    expect(ast.currency).toBe("USD");
  });

  it("converts AST into readable filter chips for the UI", () => {
    const ast = {
      date: { from: "2026-01-01", to: "2026-01-31" },
      transactionTypes: ["expense"],
      amount: { min: "500" },
      text: "Groceries",
    };

    const chips = astToChips(ast);
    expect(chips).toHaveLength(4);
    expect(chips.find((c) => c.type === "type")?.value).toBe("expense");
    expect(chips.find((c) => c.type === "text")?.value).toBe('"Groceries"');
  });
});
