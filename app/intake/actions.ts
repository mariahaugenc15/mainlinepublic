"use server";

import { redirect } from "next/navigation";
import { createIntakeJob } from "@/lib/data";

export async function submitPublicIntakeAction(formData: FormData) {
  const { jobId } = await createIntakeJob({
    customerName: String(formData.get("customerName")),
    address: String(formData.get("address")),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    leadSource: String(formData.get("leadSource") || ""),
    equipmentType: String(formData.get("equipmentType")),
    jobType: String(formData.get("jobType")),
    notes: String(formData.get("notes") || ""),
    scheduledAt: String(formData.get("preferredDate") || new Date().toISOString()),
    status: "scheduled",
    source: "public_intake",
  });
  redirect(`/intake/thank-you?job=${jobId}`);
}
