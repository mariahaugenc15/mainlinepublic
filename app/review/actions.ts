"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { resolveSecondOpinion } from "@/lib/data";

export async function respondToCaseAction(formData: FormData) {
  await requireRole("REVIEWER");
  const soId = String(formData.get("soId"));
  const decision = String(formData.get("decision")) as "confirmed" | "redirected";
  const notes = String(formData.get("notes") || "");
  const redirectedDiagnosis = String(formData.get("redirectedDiagnosis") || "") || undefined;
  resolveSecondOpinion(soId, decision, notes, redirectedDiagnosis);
  redirect("/review?responded=" + soId);
}
