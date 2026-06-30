import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiagnosticOS",
  description: "Field diagnostic intelligence for plumbing trades.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-sand-50 text-ink-900">{children}</body>
    </html>
  );
}
