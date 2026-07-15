"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  { id: "starter", label: "Starter", price: 75, desc: "Core diagnostics & estimates" },
  { id: "professional", label: "Professional", price: 100, desc: "Add second opinions, procurement & reports", recommended: true },
  { id: "enterprise", label: "Enterprise", price: 125, desc: "Full platform + SSO & API access" },
] as const;

export default function RegisterForm() {
  const [plan, setPlan] = useState<"starter" | "professional" | "enterprise">("professional");
  const [step, setStep] = useState<"plan" | "company" | "done">("plan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      companyName: fd.get("companyName"),
      adminName: fd.get("adminName"),
      email: fd.get("email"),
      password: fd.get("password"),
      plan,
    };
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      setLoading(false);
    } else {
      setStep("done");
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-xl border border-sand-300 bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-4xl">🎉</div>
        <h2 className="mb-2 text-xl font-semibold text-navy-900">You're all set!</h2>
        <p className="mb-6 text-sm text-ink-500">Your 14-day trial has started. Log in to explore HauGen.</p>
        <Link href="/login" className="block rounded-lg bg-navy-900 px-4 py-3 text-base font-medium text-white hover:bg-navy-800">
          Go to Login
        </Link>
      </div>
    );
  }

  if (step === "plan") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${plan === p.id ? "border-teal-500 bg-teal-500/5 ring-1 ring-teal-500" : "border-sand-300 bg-white hover:bg-sand-50"}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">{p.label}</span>
                  {"recommended" in p && p.recommended && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">Recommended</span>
                  )}
                </div>
                <p className="text-sm text-ink-500">{p.desc}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-navy-900">${p.price}</span>
                <span className="text-xs text-ink-500">/tech/mo</span>
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStep("company")}
          className="w-full rounded-lg bg-navy-900 px-4 py-3 text-base font-medium text-white hover:bg-navy-800"
        >
          Continue with {PLANS.find((p) => p.id === plan)?.label} →
        </button>
        <p className="text-center text-xs text-ink-500">14-day free trial · No credit card required</p>
        <p className="text-center text-sm text-ink-500">
          Already have an account? <Link href="/login" className="font-medium text-navy-700 underline">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Company Name</label>
        <input name="companyName" required className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Your Name</label>
        <input name="adminName" required className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Work Email</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Password</label>
        <input name="password" type="password" required minLength={8} className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-navy-900 px-4 py-3 text-base font-medium text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Start Free Trial"}
      </button>
      <p className="text-center text-xs text-ink-500">
        Plan: <span className="font-medium">{PLANS.find((p) => p.id === plan)?.label}</span> ·{" "}
        <button type="button" onClick={() => setStep("plan")} className="underline">Change</button>
      </p>
    </form>
  );
}
