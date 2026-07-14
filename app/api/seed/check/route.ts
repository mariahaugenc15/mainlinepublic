import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "seed-diagnosticos-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? "";
    const db = neon(url);

    const counts: Record<string, number> = {};
    for (const t of ["users","customers","jobs","diagnostic_sessions","job_outcomes","truck_stock","restock_requests"]) {
      const r = await db.query(`SELECT COUNT(*) AS n FROM ${t}`);
      counts[t] = Number(r.rows[0].n);
    }

    const sessions = await db.query(`SELECT id, job_id, tree_id, status, primary_diagnosis, confidence FROM diagnostic_sessions LIMIT 5`);
    const outcomes = await db.query(`SELECT id, job_id, session_id, matched, actual_diagnosis FROM job_outcomes LIMIT 5`);

    return NextResponse.json({ counts, sample_sessions: sessions.rows, sample_outcomes: outcomes.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
