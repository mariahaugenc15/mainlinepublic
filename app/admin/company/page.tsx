import { requireRole } from "@/lib/guard";
import { getCompanySettings } from "@/lib/data";
import { updateCompanyProfileAction } from "@/app/admin/actions";
import Image from "next/image";

export default async function CompanyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole("ADMIN");
  const { saved } = await searchParams;
  const s = await getCompanySettings();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Company Profile</h1>
      <p className="mb-6 text-sm text-ink-500">
        Your company's identity inside HauGen — shown on estimates, intake forms, and all customer-facing surfaces.
      </p>

      {saved && (
        <div className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          Profile saved successfully.
        </div>
      )}

      <form
        action={updateCompanyProfileAction}
        encType="multipart/form-data"
        className="flex flex-col gap-6"
      >
        {/* Identity */}
        <section className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Identity</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name" name="company_name" defaultValue={s?.company_name} required />
            <Field label="Support email" name="support_email" type="email" defaultValue={s?.support_email} />
            <Field label="Phone number" name="phone" type="tel" defaultValue={s?.phone} />
            <Field label="Website" name="website" type="url" placeholder="https://" defaultValue={s?.website} />
          </div>
        </section>

        {/* Location & service */}
        <section className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Location &amp; Service Area</p>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Business address" name="address" defaultValue={s?.address} placeholder="123 Main St, City, State ZIP" />
            <Field label="Service area" name="service_area" defaultValue={s?.service_area} placeholder="e.g. Metro Detroit, Oakland County, SE Michigan" />
          </div>
        </section>

        {/* Licensing & compliance */}
        <section className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Licensing &amp; Compliance</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Trade license number" name="trade_license" defaultValue={s?.trade_license} placeholder="e.g. MI-PL-012345" />
            <Field label="Insurance carrier" name="insurance_carrier" defaultValue={s?.insurance_carrier} placeholder="e.g. Acme Insurance Co." />
          </div>
        </section>

        {/* Logo */}
        <section className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Company Logo</p>
          <p className="mb-4 text-sm text-ink-500">
            Used as the brand mark on estimates and intake forms. PNG, JPG, SVG, or WebP — recommended 256×256 or larger.
          </p>
          {s?.logo_path && (
            <div className="mb-4">
              <p className="mb-2 text-xs text-ink-500">Current logo</p>
              <Image
                src={s.logo_path}
                alt="Company logo"
                width={80}
                height={80}
                className="rounded-lg border border-sand-200 object-contain"
              />
            </div>
          )}
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="block text-sm text-ink-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
          />
        </section>

        <div>
          <button
            type="submit"
            className="rounded-lg bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="h-10 rounded-lg border border-sand-300 px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20"
      />
    </div>
  );
}
