import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import DemoReset from "./_components/DemoReset";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chainsight-eight.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ChainSight — Supply Chain Intelligence",
    template: "%s | ChainSight",
  },
  description:
    "Open the app and it has already found the problem. ChainSight reads your inventory position, flags what will stock out before a reorder can arrive, and drafts the purchase order.",
  keywords: [
    "supply chain",
    "inventory management",
    "demand forecasting",
    "procurement",
    "production quality",
    "Next.js",
  ],
  authors: [{ name: "Vikesh Sagar Bairam" }],
  creator: "Vikesh Sagar Bairam",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "ChainSight — Supply Chain Intelligence",
    description:
      "An inventory command center that reads your stock position on load, finds the risks, and drafts the fix.",
    siteName: "ChainSight",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainSight — Supply Chain Intelligence",
    description:
      "An inventory command center that reads your stock position on load, finds the risks, and drafts the fix.",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#020617] text-white">
        {/* GLOBAL NAVIGATION */}
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#020617]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

            {/* BRAND */}
            <a
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                CS
              </div>

              <div>
                <div className="text-lg font-bold tracking-wide">
                  ChainSight
                </div>

                <div className="text-xs text-slate-500">
                  Supply Chain Intelligence
                </div>
              </div>
            </a>

            {/* NAVIGATION */}
            <nav className="flex items-center gap-1">

              <a
                href="/"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                About
              </a>

              <a
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Dashboard
              </a>

              <a
                href="/inventory"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Inventory
              </a>

              <a
                href="/demand-forecast"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Demand Forecast
              </a>

              <a
                href="/suppliers"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Suppliers
              </a>

              <a
                href="/purchase-orders"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Purchase Orders
              </a>

              <a
                href="/production"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Production &amp; Quality
              </a>

              <a
                href="/analytics"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Analytics
              </a>

            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1">
          {children}
        </div>

        {/* FOOTER */}
        <footer className="border-t border-slate-800 px-6 py-5">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
            <span>
              ChainSight · open source (MIT) · built by Vikesh Sagar Bairam
            </span>
            <DemoReset />
          </div>
        </footer>

        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
        />

      </body>
    </html>
  );
}