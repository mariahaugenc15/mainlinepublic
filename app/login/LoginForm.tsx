"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

const demoAccounts = [
  { role: "Technician", email: "marcus@fieldco.demo", name: "Marcus Reyes" },
  { role: "Technician", email: "janelle@fieldco.demo", name: "Janelle Strait" },
  { role: "Admin / Owner", email: "carla@fieldco.demo", name: "Carla Bishop" },
  { role: "Reviewer", email: "ellen.castro@reviewboard.demo", name: "Dr. Ellen Castro" },
];

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <>
      <form action={formAction} className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue="marcus@fieldco.demo"
          className="mb-4 w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
        <label className="mb-1 block text-sm font-medium text-ink-700">Password</label>
        <input
          name="password"
          type="password"
          required
          defaultValue="password123"
          className="mb-4 w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
        {state?.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-navy-900 px-4 py-3 text-base font-medium text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-sand-300 bg-sand-100 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Demo accounts (password: password123)</p>
        <ul className="space-y-1 text-sm text-ink-700">
          {demoAccounts.map((a) => (
            <li key={a.email} className="flex justify-between">
              <span>{a.role} — {a.name}</span>
              <span className="text-ink-500">{a.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
