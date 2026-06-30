"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, clearSessionCookie, verifyPassword } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await verifyPassword(email, password);
  if (!user) {
    return { error: "Invalid email or password." };
  }
  await createSessionCookie(user);
  if (user.role === "TECH") redirect("/tech");
  if (user.role === "REVIEWER") redirect("/review");
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
