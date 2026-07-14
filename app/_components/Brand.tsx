import Image from "next/image";
import { getCompanySettings } from "@/lib/data";

export async function getBrandName() {
  const settings = await getCompanySettings();
  return settings?.company_name || "Your Company";
}

export default async function Brand({
  size = "md",
  light = false,
}: {
  size?: "sm" | "md" | "lg";
  light?: boolean;
}) {
  const settings = await getCompanySettings();
  const companyName = settings?.company_name || "Your Company";
  const logoPath = settings?.logo_path || "";

  const badgeSize = size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  const imgPx = size === "lg" ? 48 : size === "sm" ? 32 : 40;
  const nameSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      {logoPath ? (
        <Image
          src={logoPath}
          alt={companyName}
          width={imgPx}
          height={imgPx}
          className={`shrink-0 rounded-md object-contain ${badgeSize.split(" ").filter(c => c.startsWith("h-") || c.startsWith("w-")).join(" ")}`}
        />
      ) : (
        <span className={`flex shrink-0 items-center justify-center rounded-md bg-amber-500 font-bold text-navy-950 ${badgeSize}`}>
          {companyName.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="leading-tight">
        <p className={`font-semibold ${nameSize} ${light ? "text-white" : "text-navy-900"}`}>{companyName}</p>
        <p className={`text-xs ${light ? "text-sand-300" : "text-ink-500"}`}>powered by HauGen</p>
      </div>
    </div>
  );
}
