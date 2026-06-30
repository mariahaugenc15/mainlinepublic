"use server";

import { redirect } from "next/navigation";
import path from "node:path";
import fs from "node:fs";
import { requireRole } from "@/lib/guard";
import {
  assignJobTech,
  createPurchaseOrder,
  createIntakeJob,
  fulfillRestockRequest,
  listVendorsForPart,
  setCompanyName,
  setCompanyProfile,
  setDefaultMarkupPct,
  setTechHourlyRate,
} from "@/lib/data";
import { runLiveIngestion, runBulkCsvIngestion } from "@/lib/ingestion/sdwis";

export async function createPurchaseOrderAction(formData: FormData) {
  const user = await requireRole("ADMIN");
  const vendorId = String(formData.get("vendorId"));
  const partId = String(formData.get("partId"));
  const quantity = Number(formData.get("quantity") || 0);
  const vendors = listVendorsForPart(partId);
  const pricing = vendors.find((v: any) => v.id === vendorId);
  const unitPrice = pricing?.price ?? 0;

  createPurchaseOrder(vendorId, [{ partId, quantity, unitPrice }], user.id);
  redirect("/admin/procurement?ordered=" + partId);
}

export async function fulfillRestockAction(formData: FormData) {
  await requireRole("ADMIN");
  const restockId = String(formData.get("restockId"));
  fulfillRestockRequest(restockId);
  redirect("/admin/procurement?fulfilled=" + restockId);
}

export async function refreshRegionalDataAction(formData: FormData) {
  await requireRole("ADMIN");
  const source = String(formData.get("source") || "live_api");
  const result = source === "bulk_csv" ? runBulkCsvIngestion() : await runLiveIngestion(["MI"]);
  redirect(`/admin?regionalRefresh=${result.status}`);
}

export async function createJobAction(formData: FormData) {
  await requireRole("ADMIN");
  const { jobId } = createIntakeJob({
    customerName: String(formData.get("customerName")),
    address: String(formData.get("address")),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    leadSource: String(formData.get("leadSource") || ""),
    equipmentType: String(formData.get("equipmentType")),
    equipmentMake: String(formData.get("equipmentMake") || ""),
    equipmentModel: String(formData.get("equipmentModel") || ""),
    jobType: String(formData.get("jobType")),
    notes: String(formData.get("notes") || ""),
    techId: String(formData.get("techId")),
    scheduledAt: String(formData.get("scheduledAt")),
    status: "scheduled",
    source: "admin",
  });
  redirect(`/admin/jobs/new?created=${jobId}`);
}

export async function assignIntakeJobAction(formData: FormData) {
  await requireRole("ADMIN");
  const jobId = String(formData.get("jobId"));
  const techId = String(formData.get("techId"));
  const scheduledAt = String(formData.get("scheduledAt"));
  assignJobTech(jobId, techId, scheduledAt);
  redirect(`/admin/intake?assigned=${jobId}`);
}

export async function updateCompanyNameAction(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("companyName") || "").trim();
  if (!name) return;
  setCompanyName(name);
  redirect(`/admin/pricing?updated=name`);
}

export async function updateMarkupAction(formData: FormData) {
  await requireRole("ADMIN");
  const pct = Number(formData.get("markupPct") || 0);
  setDefaultMarkupPct(pct);
  redirect(`/admin/pricing?updated=markup`);
}

export async function updateTechRateAction(formData: FormData) {
  await requireRole("ADMIN");
  const userId = String(formData.get("userId"));
  const rate = Number(formData.get("hourlyRate") || 0);
  setTechHourlyRate(userId, rate);
  redirect(`/admin/pricing?updated=${userId}`);
}

export async function updateCompanyProfileAction(formData: FormData) {
  await requireRole("ADMIN");

  let logo_path: string | undefined;
  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const allowed = ["png", "jpg", "jpeg", "svg", "webp"];
    if (allowed.includes(ext)) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const buf = Buffer.from(await logoFile.arrayBuffer());
      const filename = `logo.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buf);
      logo_path = `/uploads/${filename}`;
    }
  }

  setCompanyProfile({
    company_name: String(formData.get("company_name") || "").trim() || "Your Company",
    address: String(formData.get("address") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    support_email: String(formData.get("support_email") || "").trim(),
    website: String(formData.get("website") || "").trim(),
    logo_path,
    trade_license: String(formData.get("trade_license") || "").trim(),
    insurance_carrier: String(formData.get("insurance_carrier") || "").trim(),
    service_area: String(formData.get("service_area") || "").trim(),
  });

  redirect("/admin/company?saved=1");
}
