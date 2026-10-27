import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../features/auth/session";
import { exportFullJsonBackup } from "../../../../features/import-export/service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jsonString = await exportFullJsonBackup(user.id);
    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="linked_coin_backup_${dateStr}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to export backup" }, { status: 500 });
  }
}
