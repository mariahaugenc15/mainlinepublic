import { requireRole } from "@/lib/guard";
import { getConfidenceCalibration } from "@/lib/data";

export default async function CalibrationPage() {
  await requireRole("ADMIN");
  const bands = getConfidenceCalibration();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Confidence Calibration</h1>
      <p className="mb-6 text-sm text-ink-500">How well the model's stated confidence predicts actual diagnosis accuracy</p>

      <div className="flex flex-col gap-4">
        {bands.map((b: any) => {
          const actual = b.n ? Math.round((b.matched_n / b.n) * 1000) / 10 : 0;
          return (
            <div key={b.band} className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-base font-semibold text-navy-900">{b.band} confidence band</p>
                <p className="text-sm text-ink-500">{b.n} session{b.n === 1 ? "" : "s"}</p>
              </div>
              <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                <span>Actual match rate</span>
                <span className="font-semibold text-ink-700">{actual}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-sand-200">
                <div
                  className={`h-full ${actual >= 70 ? "bg-success" : actual >= 50 ? "bg-amber-500" : "bg-danger"}`}
                  style={{ width: `${actual}%` }}
                />
              </div>
            </div>
          );
        })}
        {bands.length === 0 && <p className="text-sm text-ink-500">No closed sessions yet.</p>}
      </div>
    </div>
  );
}
