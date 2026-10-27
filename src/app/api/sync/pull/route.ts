import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../../../../db";
import { financialEvents } from "../../../../db/schema";
import { getSessionUser } from "../../../../features/auth/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor") || "0";
  const cursor = BigInt(cursorParam);

  try {
    const events = await db
      .select()
      .from(financialEvents)
      .where(and(eq(financialEvents.userId, user.id), gt(financialEvents.sequence, cursor)))
      .orderBy(financialEvents.sequence)
      .limit(100);

    const serializedEvents = events.map((ev) => ({
      ...ev,
      sequence: ev.sequence.toString(),
    }));

    const nextCursor =
      events.length > 0 ? events[events.length - 1].sequence.toString() : cursorParam;

    return NextResponse.json({
      events: serializedEvents,
      nextCursor,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to pull events" }, { status: 500 });
  }
}
