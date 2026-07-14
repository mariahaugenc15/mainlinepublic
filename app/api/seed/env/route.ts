import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "seed-diagnosticos-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const vars = [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NO_SSL",
    "NEON_DATABASE_URL",
    "PG_URL",
    "PGHOST",
    "PGDATABASE",
    "PGUSER",
    "PGPORT",
  ];

  const result: Record<string, string> = {};
  for (const v of vars) {
    const val = process.env[v];
    if (val) {
      result[v] = val.slice(0, 30) + "…[set]";
    } else {
      result[v] = "(not set)";
    }
  }

  return NextResponse.json(result);
}
