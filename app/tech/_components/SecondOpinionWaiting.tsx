"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveSecondOpinionAction } from "@/app/tech/actions";

export default function SecondOpinionWaiting({ soId }: { soId: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    const timeout = setTimeout(async () => {
      await resolveSecondOpinionAction(soId);
      router.refresh();
    }, 4000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [soId, router]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-sand-300 bg-white p-8 text-center shadow-sm">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-amber-500" />
      <p className="text-sm font-medium text-ink-700">Waiting for reviewer response…</p>
      <p className="text-xs text-ink-500">Typically responds in {seconds > 0 ? `~${seconds}s` : "a moment"}</p>
    </div>
  );
}
