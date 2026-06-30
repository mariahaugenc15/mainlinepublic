import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { logoutAction } from "@/app/actions";

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TECH");

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-navy-950 px-4 py-3 text-white">
        <Link href="/tech" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 font-bold text-navy-950">D</span>
          <span className="font-semibold">DiagnosticOS</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-sand-200 sm:inline">{user.name}</span>
          <form action={logoutAction}>
            <button className="rounded-md border border-white/20 px-3 py-2 text-sm text-white active:bg-white/10">Log out</button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-sand-300 bg-white">
        <Link href="/tech" className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-navy-800 active:bg-sand-100">
          <span className="text-lg">📋</span>
          Job Queue
        </Link>
        <Link href="/tech/truck" className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-navy-800 active:bg-sand-100">
          <span className="text-lg">🚚</span>
          My Truck
        </Link>
      </nav>
    </div>
  );
}
