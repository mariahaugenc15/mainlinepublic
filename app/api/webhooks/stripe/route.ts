import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");

  // In demo mode or without secret, skip signature verification
  if (secret && signature) {
    try {
      const stripe = (await import("stripe")).default;
      const client = new stripe(process.env.STRIPE_SECRET_KEY ?? "");
      const body = await req.text();
      client.webhooks.constructEvent(body, signature, secret);
    } catch (e: any) {
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ received: true });

  const { type, data } = payload;

  try {
    if (type === "invoice.paid") {
      const inv = data.object;
      await sql`INSERT INTO billing_events (id, description, amount, status, stripe_invoice_id, created_at)
        VALUES (${inv.id}, ${"Subscription payment"}, ${inv.amount_paid / 100}, ${"paid"}, ${inv.id}, ${new Date().toISOString()})
        ON CONFLICT DO NOTHING`;
      await sql`UPDATE company_settings SET billing_status = 'active', current_period_start = ${new Date(inv.period_start * 1000).toISOString()}, current_period_end = ${new Date(inv.period_end * 1000).toISOString()} WHERE id = 'singleton'`;
    }

    if (type === "invoice.payment_failed") {
      await sql`UPDATE company_settings SET billing_status = 'past_due' WHERE id = 'singleton'`;
    }

    if (type === "customer.subscription.deleted") {
      await sql`UPDATE company_settings SET billing_status = 'canceled' WHERE id = 'singleton'`;
    }

    if (type === "customer.subscription.updated") {
      const sub = data.object;
      const seats = sub.items?.data?.[0]?.quantity ?? 0;
      await sql`UPDATE company_settings SET billing_seat_count = ${seats}, billing_status = ${sub.status} WHERE id = 'singleton'`;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
