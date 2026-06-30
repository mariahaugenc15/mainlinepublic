"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { createPurchaseOrder, fulfillRestockRequest, listVendorsForPart } from "@/lib/data";

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
