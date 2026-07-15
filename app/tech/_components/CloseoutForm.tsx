"use client";

import { useState } from "react";
import { closeJobAction } from "@/app/tech/actions";

type Part = { partNumber: string; name: string; qty: number };

export default function CloseoutForm({
  jobId,
  sessionId,
  primaryDiagnosis,
  suggestedDiagnosis,
  parts,
}: {
  jobId: string;
  sessionId: string;
  primaryDiagnosis: string;
  suggestedDiagnosis: string;
  parts: Part[];
}) {
  const [matched, setMatched] = useState<"yes" | "no">(suggestedDiagnosis === primaryDiagnosis ? "yes" : "no");
  const [actualDiagnosis, setActualDiagnosis] = useState(suggestedDiagnosis);
  const [usedParts, setUsedParts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(parts.map((p) => [p.partNumber, true]))
  );

  const partsUsed = parts.filter((p) => usedParts[p.partNumber]);

  return (
    <form action={closeJobAction} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="actualDiagnosis" value={actualDiagnosis} />
      <input type="hidden" name="matched" value={String(actualDiagnosis === primaryDiagnosis)} />
      <input type="hidden" name="partsUsed" value={JSON.stringify(partsUsed)} />

      {/* AI accuracy rating — this feedback trains the model */}
      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Rate the AI diagnosis</h2>
          <span className="rounded-full bg-navy-900/10 px-2 py-0.5 text-xs font-semibold text-navy-800">Trains the model</span>
        </div>
        <p className="mb-3 text-xs text-ink-500">
          HauGen diagnosed: <span className="font-semibold text-ink-700">{primaryDiagnosis}</span>
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setMatched("yes");
              setActualDiagnosis(primaryDiagnosis);
            }}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-left ${
              matched === "yes" ? "border-success bg-success/10 text-success" : "border-sand-300 text-ink-700"
            }`}
          >
            <span className="text-base">✅</span>
            <span>Accurate — matched the actual issue</span>
            {matched === "yes" && <span className="ml-auto">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setMatched("no")}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-left ${
              matched === "no" ? "border-amber-500 bg-amber-100 text-amber-600" : "border-sand-300 text-ink-700"
            }`}
          >
            <span className="text-base">❌</span>
            <span>Inaccurate — actual issue was different</span>
            {matched === "no" && <span className="ml-auto">✓</span>}
          </button>
        </div>
        {matched === "no" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-ink-500">What was the actual diagnosis?</label>
            <input
              type="text"
              value={actualDiagnosis === primaryDiagnosis ? "" : actualDiagnosis}
              onChange={(e) => setActualDiagnosis(e.target.value)}
              placeholder="Describe the real issue — this improves future diagnoses"
              className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-base outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Parts Used</h2>
        {parts.length === 0 && <p className="text-sm text-ink-500">No parts recommended for this diagnosis.</p>}
        <div className="flex flex-col gap-2">
          {parts.map((p) => (
            <label key={p.partNumber} className="flex items-center justify-between rounded-lg border border-sand-200 px-3 py-2.5 text-sm">
              <span className="text-ink-700">{p.name} ×{p.qty}</span>
              <input
                type="checkbox"
                checked={!!usedParts[p.partNumber]}
                onChange={(e) => setUsedParts((u) => ({ ...u, [p.partNumber]: e.target.checked }))}
                className="h-5 w-5 accent-navy-700"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={matched === "no" && !actualDiagnosis.trim()}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white active:bg-navy-800 disabled:opacity-50"
      >
        Confirm &amp; Close Job
      </button>
    </form>
  );
}
