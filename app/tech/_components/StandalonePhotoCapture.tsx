"use client";

import { useRef, useState } from "react";
import { startPhotoAction } from "@/app/tech/actions";

type Category = { id: string; name: string };

export default function StandalonePhotoCapture({
  jobId,
  categories,
}: {
  jobId: string;
  categories: Category[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [stage, setStage] = useState<"idle" | "preview" | "analyzing" | "done">("idle");
  const [picked, setPicked] = useState<Category | null>(null);
  const [confidence, setConfidence] = useState(0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ url, type: file.type.startsWith("video") ? "video" : "image" });
    setStage("preview");
  }

  function analyze() {
    setStage("analyzing");
    setTimeout(() => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const conf = Math.floor(Math.random() * 22) + 67;
      setPicked(cat);
      setConfidence(conf);
      setStage("done");
    }, 2200);
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setStage("idle");
    setPicked(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {stage === "idle" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 text-ink-500 active:bg-sand-100"
        >
          <span className="text-5xl">📷</span>
          <span className="text-base font-medium text-ink-700">Capture photo or video</span>
          <span className="text-sm text-ink-500">Opens your camera — or choose from library</span>
        </button>
      )}

      {stage === "preview" && preview && (
        <div>
          <div className="overflow-hidden rounded-xl bg-navy-950">
            {preview.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Captured" className="max-h-72 w-full object-cover" />
            ) : (
              <video src={preview.url} controls className="max-h-72 w-full" />
            )}
          </div>
          <p className="mt-2 text-center text-xs text-ink-500">Looks good? Tap Analyze to run it against the defect database.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={retake}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-ink-700 active:bg-sand-100"
            >
              Retake
            </button>
            <button
              onClick={analyze}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-navy-900 text-sm font-semibold text-white active:bg-navy-800"
            >
              Analyze →
            </button>
          </div>
        </div>
      )}

      {stage === "analyzing" && preview && (
        <div>
          <div className="relative overflow-hidden rounded-xl bg-navy-950">
            {preview.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Analyzing" className="max-h-72 w-full object-cover opacity-35" />
            ) : (
              <video src={preview.url} className="max-h-72 w-full opacity-35" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-amber-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Scanning for defects…</p>
                <p className="mt-0.5 text-xs text-white/50">Matching against defect taxonomy and manufacturer bulletins</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "done" && picked && preview && (
        <div>
          <div className="relative overflow-hidden rounded-xl bg-navy-950">
            {preview.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Result" className="max-h-72 w-full object-cover opacity-40" />
            ) : (
              <video src={preview.url} className="max-h-72 w-full opacity-40" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-sand-300">Visual Match</span>
              <span className="text-xl font-semibold text-white">{picked.name}</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${confidence}%` }} />
                </div>
                <span className="text-sm font-semibold text-amber-400">{confidence}% match</span>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-sand-200 bg-white p-4 text-sm text-ink-700">
            <p className="font-medium text-navy-900">Photo logged.</p>
            <p className="mt-0.5 text-ink-500">Tap below to start the full diagnostic — the system will walk you through additional questions based on this finding.</p>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={retake}
              className="flex h-12 w-20 items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-ink-700 active:bg-sand-100"
            >
              Retake
            </button>
            <form action={startPhotoAction} className="flex-1">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="categoryId" value={picked.id} />
              <input type="hidden" name="confidence" value={confidence} />
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-navy-900 text-sm font-semibold text-white active:bg-navy-800"
              >
                Start Full Diagnostic →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
