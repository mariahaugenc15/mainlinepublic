"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, clearSessionCookie, verifyPassword } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  try {
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
  } catch (e: any) {
    // redirect() throws internally — let it propagate
    if (e?.message === "NEXT_REDIRECT") throw e;
    return { error: `Server error: ${e?.message ?? "unknown error"}` };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
