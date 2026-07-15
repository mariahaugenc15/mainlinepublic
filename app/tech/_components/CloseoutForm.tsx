"use client";

import { useState, useRef } from "react";
import { closeJobAction } from "@/app/tech/actions";

type Part = { partNumber: string; name: string; qty: number };
type CatalogPart = { partNumber: string; name: string; category: string; unitCost: number };

export default function CloseoutForm({
  jobId,
  sessionId,
  primaryDiagnosis,
  suggestedDiagnosis,
  parts,
  allParts,
}: {
  jobId: string;
  sessionId: string;
  primaryDiagnosis: string;
  suggestedDiagnosis: string;
  parts: Part[];
  allParts: CatalogPart[];
}) {
  const [matched, setMatched] = useState<"yes" | "no">(suggestedDiagnosis === primaryDiagnosis ? "yes" : "no");
  const [actualDiagnosis, setActualDiagnosis] = useState(suggestedDiagnosis);
  const [usedParts, setUsedParts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(parts.map((p) => [p.partNumber, true]))
  );
  const [extraParts, setExtraParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const recommendedPartNumbers = new Set(parts.map((p) => p.partNumber));

  const filtered = search.trim().length > 0
    ? allParts.filter(
        (p) =>
          !recommendedPartNumbers.has(p.partNumber) &&
          !extraParts.find((e) => e.partNumber === p.partNumber) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.partNumber.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  function addExtraPart(p: CatalogPart) {
    setExtraParts((prev) => [...prev, { partNumber: p.partNumber, name: p.name, qty: 1 }]);
    setSearch("");
    setShowSearch(false);
  }

  function updateQty(partNumber: string, qty: number) {
    setExtraParts((prev) => prev.map((p) => (p.partNumber === partNumber ? { ...p, qty } : p)));
  }

  function removeExtra(partNumber: string) {
    setExtraParts((prev) => prev.filter((p) => p.partNumber !== partNumber));
  }

  const recommendedUsed = parts.filter((p) => usedParts[p.partNumber]);
  const allPartsUsed = [...recommendedUsed, ...extraParts];

  return (
    <form action={closeJobAction} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="actualDiagnosis" value={actualDiagnosis} />
      <input type="hidden" name="matched" value={String(actualDiagnosis === primaryDiagnosis)} />
      <input type="hidden" name="partsUsed" value={JSON.stringify(allPartsUsed)} />

      {/* AI accuracy rating */}
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
            onClick={() => { setMatched("yes"); setActualDiagnosis(primaryDiagnosis); }}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-left ${matched === "yes" ? "border-success bg-success/10 text-success" : "border-sand-300 text-ink-700"}`}
          >
            <span className="text-base">✅</span>
            <span>Accurate — matched the actual issue</span>
            {matched === "yes" && <span className="ml-auto">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setMatched("no")}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-left ${matched === "no" ? "border-amber-500 bg-amber-100 text-amber-600" : "border-sand-300 text-ink-700"}`}
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

      {/* Parts used */}
      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Parts Used</h2>

        {parts.length === 0 && extraParts.length === 0 && (
          <p className="mb-3 text-sm text-ink-500">No parts recommended — add any parts used below.</p>
        )}

        {/* Recommended parts checkboxes */}
        <div className="flex flex-col gap-2">
          {parts.map((p) => (
            <label key={p.partNumber} className="flex items-center justify-between rounded-lg border border-sand-200 px-3 py-2.5 text-sm">
              <span className="text-ink-700">{p.name} <span className="text-ink-400">×{p.qty}</span></span>
              <input
                type="checkbox"
                checked={!!usedParts[p.partNumber]}
                onChange={(e) => setUsedParts((u) => ({ ...u, [p.partNumber]: e.target.checked }))}
                className="h-5 w-5 accent-navy-700"
              />
            </label>
          ))}
        </div>

        {/* Extra parts added via search */}
        {extraParts.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {extraParts.map((p) => (
              <div key={p.partNumber} className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2.5 text-sm">
                <span className="flex-1 text-ink-700">{p.name}</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink-500">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={p.qty}
                    onChange={(e) => updateQty(p.partNumber, Math.max(1, Number(e.target.value)))}
                    className="w-14 rounded border border-sand-300 px-2 py-1 text-center text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeExtra(p.partNumber)}
                    className="ml-1 text-danger text-lg leading-none"
                    aria-label="Remove"
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parts search */}
        <div className="mt-3 relative">
          {!showSearch ? (
            <button
              type="button"
              onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-sand-300 px-3 py-2.5 text-sm text-ink-500 hover:border-navy-400 hover:text-navy-700"
            >
              <span className="text-base">+</span> Add a part not on the list
            </button>
          ) : (
            <div>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { if (!search.trim()) setShowSearch(false); }}
                placeholder="Search by part name or number…"
                className="w-full rounded-lg border border-navy-400 px-3 py-2.5 text-base outline-none ring-2 ring-navy-600/20"
              />
              {filtered.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-sand-300 bg-white shadow-md">
                  {filtered.map((p) => (
                    <li key={p.partNumber}>
                      <button
                        type="button"
                        onMouseDown={() => addExtraPart(p)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-sand-50"
                      >
                        <div>
                          <span className="font-medium text-ink-900">{p.name}</span>
                          <span className="ml-2 text-xs text-ink-400">{p.partNumber}</span>
                        </div>
                        <span className="text-xs text-ink-500">${p.unitCost.toFixed(2)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {search.trim().length > 0 && filtered.length === 0 && (
                <p className="mt-1 px-1 text-xs text-ink-400">No matching parts found.</p>
              )}
            </div>
          )}
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
