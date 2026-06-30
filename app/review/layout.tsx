import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { logoutAction } from "@/app/actions";
import Brand from "@/app/_components/Brand";

export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("REVIEWER");

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="flex items-center justify-between bg-navy-950 px-6 py-4 text-white">
        <Link href="/review" className="flex items-center gap-2">
          <Brand size="sm" light />
          <span className="font-semibold text-sand-200">— Review Board</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-sand-200">{user.name} · {user.credential}</span>
          <form action={logoutAction}>
            <button className="rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
