import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "TECH") redirect("/tech");
  if (session.role === "REVIEWER") redirect("/review");
  redirect("/admin");
}
