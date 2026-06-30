import { listEquipmentTypes } from "@/lib/data";
import { submitPublicIntakeAction } from "@/app/intake/actions";
import Brand from "@/app/_components/Brand";

export default async function PublicIntakePage() {
  const equipmentTypes = listEquipmentTypes();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50 px-4 py-8">
      <div className="mb-6">
        <Brand size="md" />
      </div>

      <h1 className="mb-1 text-xl font-semibold text-navy-900">Request Service</h1>
      <p className="mb-6 text-sm text-ink-500">Tell us about the issue and we'll get a technician scheduled.</p>

      <form action={submitPublicIntakeAction} className="flex flex-col gap-5 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Full name</label>
            <input name="customerName" required className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Service address</label>
            <input name="address" required className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Phone</label>
            <input name="phone" required type="tel" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Email</label>
            <input name="email" type="email" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-sand-200 pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">What type of equipment is involved?</label>
            <select name="equipmentType" required className="h-12 rounded-lg border border-sand-300 px-2 text-base">
              <option value="">Select…</option>
              {equipmentTypes.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">What's going on?</label>
            <input name="jobType" required placeholder="e.g. Leak, No hot water, Clogged drain" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Additional details</label>
            <textarea name="notes" rows={3} className="rounded-lg border border-sand-300 px-3 py-2 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-700">Preferred date/time</label>
            <input type="datetime-local" name="preferredDate" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-sand-200 pt-4">
          <label className="text-xs font-medium text-ink-700">How did you hear about us?</label>
          <select name="leadSource" className="h-12 rounded-lg border border-sand-300 px-2 text-base">
            <option value="">Select…</option>
            <option value="website">Website</option>
            <option value="google">Google Search</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="referral">Referral</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button type="submit" className="h-14 rounded-xl bg-navy-900 text-base font-semibold text-white shadow-sm active:bg-navy-800">
          Request Service
        </button>
      </form>
    </div>
  );
}
