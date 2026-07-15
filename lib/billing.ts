export type PlanTier = "starter" | "professional" | "enterprise";
export type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

export interface PlanConfig {
  name: string;
  pricePerSeat: number;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  starter: {
    name: "Starter",
    pricePerSeat: 75,
    features: ["diagnostic_trees", "photo_capture", "estimates"],
  },
  professional: {
    name: "Professional",
    pricePerSeat: 100,
    features: ["diagnostic_trees", "photo_capture", "estimates", "second_opinions", "procurement", "accuracy_reports"],
  },
  enterprise: {
    name: "Enterprise",
    pricePerSeat: 125,
    features: ["diagnostic_trees", "photo_capture", "estimates", "second_opinions", "procurement", "accuracy_reports", "review_board", "api_access", "sso"],
  },
};

export interface BillingState {
  plan: PlanTier;
  status: BillingStatus;
  seatCount: number;
  activeSeats: number;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  projectedMonthlyTotal: number;
  history: BillingEvent[];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface BillingEvent {
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

const DEMO_MODE = process.env.BILLING_MODE === "demo";

const DEMO_STATE: BillingState = {
  plan: "professional",
  status: "active",
  seatCount: 6,
  activeSeats: 5,
  trialEndsAt: null,
  currentPeriodStart: "2026-07-01",
  currentPeriodEnd: "2026-07-31",
  projectedMonthlyTotal: 600,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  history: [
    { date: "2026-07-01", description: "Professional Plan — 6 seats", amount: 600, status: "paid" },
    { date: "2026-06-01", description: "Professional Plan — 6 seats", amount: 600, status: "paid" },
    { date: "2026-05-01", description: "Professional Plan — 5 seats", amount: 500, status: "paid" },
  ],
};

export async function getBillingState(): Promise<BillingState> {
  if (DEMO_MODE) return DEMO_STATE;

  const { sql } = await import("./db");
  const rows = await sql`SELECT * FROM company_settings WHERE id = 'singleton'`;
  const cs = rows[0];
  if (!cs) return DEMO_STATE;

  const plan: PlanTier = (cs.billing_plan as PlanTier) || "professional";
  const status: BillingStatus = (cs.billing_status as BillingStatus) || "trialing";
  const seatCount = cs.billing_seat_count ?? 0;
  const rate = PLAN_CONFIG[plan].pricePerSeat;

  let history: BillingEvent[] = [];
  try {
    const evtRows = await sql`SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 12`;
    history = evtRows.map((e: any) => ({
      date: e.created_at?.slice(0, 10) ?? "",
      description: e.description,
      amount: e.amount,
      status: e.status,
    }));
  } catch {}

  let activeSeats = seatCount;
  try {
    const techRows = await sql`SELECT COUNT(*) AS cnt FROM users WHERE role = 'TECH'`;
    activeSeats = Number(techRows[0]?.cnt ?? seatCount);
  } catch {}

  return {
    plan,
    status,
    seatCount,
    activeSeats,
    trialEndsAt: cs.trial_ends_at ?? null,
    currentPeriodStart: cs.current_period_start ?? null,
    currentPeriodEnd: cs.current_period_end ?? null,
    projectedMonthlyTotal: seatCount * rate,
    stripeCustomerId: cs.stripe_customer_id ?? null,
    stripeSubscriptionId: cs.stripe_subscription_id ?? null,
    history,
  };
}

export function checkFeatureAccess(plan: PlanTier, feature: string): boolean {
  return PLAN_CONFIG[plan].features.includes(feature);
}

export function planBadgeClass(plan: PlanTier) {
  return plan === "enterprise"
    ? "bg-purple-100 text-purple-800"
    : plan === "professional"
    ? "bg-teal-100 text-teal-700"
    : "bg-sand-100 text-ink-700";
}

export function statusBadgeClass(status: BillingStatus) {
  return status === "active"
    ? "bg-success/10 text-success"
    : status === "trialing"
    ? "bg-amber-100 text-amber-700"
    : "bg-danger/10 text-danger";
}
