import { requireRole } from "@/lib/guard";
import { listManufacturers, listBulletinsForManufacturer } from "@/lib/data";

export default async function ManufacturersPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireRole("ADMIN");
  const { m } = await searchParams;
  const manufacturers = await listManufacturers();
  const selected = m ? manufacturers.find((mfr: any) => mfr.id === m) : manufacturers[0];
  const bulletins = selected ? await listBulletinsForManufacturer(selected.id) : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Manufacturer Data Library</h1>
      <p className="mb-6 text-sm text-ink-500">Technical bulletins referenced by the diagnostic engine</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {manufacturers.map((mfr: any) => (
          <a
            key={mfr.id}
            href={`/admin/manufacturers?m=${mfr.id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              selected?.id === mfr.id ? "bg-navy-900 text-white" : "bg-white text-ink-700 border border-sand-300"
            }`}
          >
            {mfr.name}
          </a>
        ))}
      </div>

      {selected && (
        <>
          <div className="mb-5 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">{selected.name}</h2>
            <p className="text-sm text-ink-500">{selected.description}</p>
          </div>

          <div className="flex flex-col gap-3">
            {bulletins.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy-900">{b.bulletin_number} — {b.product_line}</p>
                  {b.defect_code && (
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-ink-500">{b.defect_code} · {b.defect_family}</span>
                  )}
                </div>
                <p className="text-sm text-ink-700"><span className="font-medium">Symptom:</span> {b.symptom}</p>
                <p className="text-sm text-ink-700"><span className="font-medium">Root cause:</span> {b.root_cause}</p>
                <p className="text-sm text-ink-700"><span className="font-medium">Recommended fix:</span> {b.recommended_fix}</p>
                <p className="mt-1 text-xs text-ink-500">Applicable models: {b.applicable_models}</p>
              </div>
            ))}
            {bulletins.length === 0 && <p className="text-sm text-ink-500">No bulletins for this manufacturer.</p>}
          </div>
        </>
      )}
    </div>
  );
}
