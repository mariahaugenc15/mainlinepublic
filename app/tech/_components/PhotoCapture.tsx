"use client";

import { useState } from "react";
import { submitPhotoAction } from "@/app/tech/actions";

type Category = { id: string; name: string };

export default function PhotoCapture({
  jobId,
  sessionId,
  nodeId,
  prompt,
  categories,
}: {
  jobId: string;
  sessionId: string;
  nodeId: string;
  prompt: string;
  categories: Category[];
}) {
  const [stage, setStage] = useState<"idle" | "captured" | "analyzing" | "done">("idle");
  const [picked, setPicked] = useState<Category | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

  function capture() {
    setStage("captured");
    setTimeout(() => {
      setStage("analyzing");
      setTimeout(() => {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const conf = Math.floor(Math.random() * 26) + 62; // 62-87
        setPicked(cat);
        setConfidence(conf);
        setStage("done");
      }, 1800);
    }, 500);
  }

  return (
    <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-navy-900">{prompt}</h2>

      {stage === "idle" && (
        <button
          onClick={capture}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 text-ink-500 active:bg-sand-100"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-medium">Tap to capture photo</span>
        </button>
      )}

      {stage === "captured" && (
        <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl bg-navy-950 text-white">
          <span className="text-3xl">✓</span>
          <span className="text-sm font-medium">Photo captured</span>
        </div>
      )}

      {stage === "analyzing" && (
        <div className="flex h-32 w-full flex-col items-center justify-center gap-3 rounded-xl bg-navy-950 text-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-amber-500" />
          <span className="text-sm font-medium">AI analyzing image…</span>
        </div>
      )}

      {stage === "done" && picked && (
        <div>
          <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl bg-navy-950 text-white">
            <span className="text-xs uppercase tracking-wide text-sand-200">Detected</span>
            <span className="text-base font-semibold">{picked.name}</span>
            <span className="text-sm text-amber-500">{confidence}% confidence</span>
          </div>
          <form action={submitPhotoAction} className="mt-4">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="nodeId" value={nodeId} />
            <input type="hidden" name="categoryId" value={picked.id} />
            <input type="hidden" name="confidence" value={confidence} />
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white active:bg-navy-800"
            >
              Continue
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
