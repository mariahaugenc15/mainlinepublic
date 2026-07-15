import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rid } from "@/lib/ids";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { companyName, adminName, email, password, plan } = body;
  if (!companyName || !adminName || !email || !password || !plan) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(password, 10);
  const userId = rid("usr");

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  await sql`INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES (${userId}, ${email}, ${hash}, ${adminName}, ${"ADMIN"}, ${new Date().toISOString()})`;

  await sql`UPDATE company_settings SET
    company_name = ${companyName},
    billing_plan = ${plan},
    billing_status = ${"trialing"},
    trial_ends_at = ${trialEndsAt},
    billing_seat_count = 0
    WHERE id = 'singleton'`;

  return NextResponse.json({ ok: true });
}
