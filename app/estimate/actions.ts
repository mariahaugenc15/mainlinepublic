"use server";

import { redirect } from "next/navigation";
import { signEstimate } from "@/lib/data";

export async function signEstimateAction(estimateId: string, formData: FormData) {
  const signatureName = String(formData.get("signatureName") || "");
  const signatureData = String(formData.get("signatureData") || "");
  if (!signatureName.trim()) return;
  signEstimate(estimateId, signatureName.trim(), signatureData);
  redirect(`/estimate/${estimateId}?signed=1`);
}
