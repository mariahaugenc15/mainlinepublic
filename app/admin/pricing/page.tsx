import { requireRole } from "@/lib/guard";
import { listAllTechs, getCompanySettings } from "@/lib/data";
import { updateCompanyNameAction, updateMarkupAction, updateTechRateAction } from "@/app/admin/actions";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  await requireRole("ADMIN");
  const { updated } = await searchParams;
  const settings = getCompanySettings();
  const techs = listAllTechs();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Pricing</h1>
      <p className="mb-6 text-sm text-ink-500">Set labor rates and the company markup used to compute job estimates</p>

      {updated && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          {updated === "name" ? "Company name updated." : "Pricing updated."}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Company name</p>
        <p className="mb-3 text-sm text-ink-500">Shown to customers on intake forms and estimates, alongside "powered by HauGen".</p>
        <form action={updateCompanyNameAction} className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Company name</label>
            <input
              type="text"
              name="companyName"
              defaultValue={settings.company_name}
              required
              className="h-10 w-64 rounded-lg border border-sand-300 px-3 text-sm"
            />
          </div>
          <button type="submit" className="h-10 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
            Save
          </button>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Company markup</p>
        <p className="mb-3 text-sm text-ink-500">Applied to parts + labor cost on every estimate.</p>
        <form action={updateMarkupAction} className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Markup %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              name="markupPct"
              defaultValue={settings.default_markup_pct}
              required
              className="h-10 w-32 rounded-lg border border-sand-300 px-3 text-sm"
            />
          </div>
          <button type="submit" className="h-10 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
            Save
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Technician labor rates</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="py-2">Technician</th>
              <th className="py-2">Email</th>
              <th className="py-2">Hourly rate</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t: any) => (
              <tr key={t.id} className="border-b border-sand-100 last:border-0">
                <td className="py-2 font-medium text-navy-900">{t.name}</td>
                <td className="py-2 text-ink-500">{t.email}</td>
                <td className="py-2">
                  <form action={updateTechRateAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={t.id} />
                    <span className="text-ink-500">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      name="hourlyRate"
                      defaultValue={t.hourly_rate ?? 0}
                      required
                      className="h-9 w-24 rounded-lg border border-sand-300 px-2 text-sm"
                    />
                    <span className="text-ink-500">/hr</span>
                    <button type="submit" className="h-9 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
