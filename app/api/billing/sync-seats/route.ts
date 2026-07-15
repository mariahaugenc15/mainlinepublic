import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.BILLING_SYNC_SECRET ?? "sync-secret"}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const techRows = await sql`SELECT COUNT(*) AS cnt FROM users WHERE role = 'TECH'`;
  const activeSeats = Number(techRows[0]?.cnt ?? 0);

  await sql`UPDATE company_settings SET billing_seat_count = ${activeSeats} WHERE id = 'singleton'`;

  return NextResponse.json({ ok: true, activeSeats });
}
