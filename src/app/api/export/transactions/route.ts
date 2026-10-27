import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../features/auth/session";
import { exportTransactionsCsv } from "../../../../features/import-export/service";
import { parseQueryString } from "../../../../features/query-builder/parser";
import { queryAstSchema } from "../../../../features/query-builder/validation";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const rawAst = parseQueryString(q);
    const validatedAst = queryAstSchema.parse(rawAst);
    const csvContent = await exportTransactionsCsv(user.id, validatedAst);
    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions_${dateStr}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to export CSV" }, { status: 500 });
  }
}
