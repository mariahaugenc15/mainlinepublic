import { getCompanySettings } from "@/lib/data";

export function getBrandName() {
  const settings = getCompanySettings();
  return settings?.company_name || "Your Company";
}

export default function Brand({
  size = "md",
  light = false,
}: {
  size?: "sm" | "md" | "lg";
  light?: boolean;
}) {
  const companyName = getBrandName();
  const badgeSize = size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  const nameSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      <span className={`flex shrink-0 items-center justify-center rounded-md bg-amber-500 font-bold text-navy-950 ${badgeSize}`}>
        {companyName.charAt(0).toUpperCase()}
      </span>
      <div className="leading-tight">
        <p className={`font-semibold ${nameSize} ${light ? "text-white" : "text-navy-900"}`}>{companyName}</p>
        <p className={`text-xs ${light ? "text-sand-300" : "text-ink-500"}`}>powered by HauGen</p>
      </div>
    </div>
  );
}
