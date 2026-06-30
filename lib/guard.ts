import { redirect } from "next/navigation";
import { getSession, Role, SessionUser } from "./auth";

export async function requireRole(role: Role): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) {
    if (session.role === "TECH") redirect("/tech");
    if (session.role === "REVIEWER") redirect("/review");
    redirect("/admin");
  }
  return session;
}
