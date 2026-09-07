import type { Metadata } from "next";

import AiBriefing from "../_components/AiBriefing";

export const metadata: Metadata = {
  title: "Dashboard | ChainSight",
  description:
    "The Morning Briefing — ranked inventory risks and one-click reorders, generated on load.",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ChainSight
            </h1>
            <p className="text-sm text-slate-400">
              Intelligent Inventory & Supply Chain Operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              System Operational
            </span>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold">
              VB
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden min-h-[calc(100vh-81px)] w-64 border-r border-slate-800 py-8 md:block">
          <nav className="space-y-2 px-4">
            <NavItem label="About" href="/" />
            <NavItem label="Dashboard" href="/dashboard" active />
            <NavItem label="Inventory" href="/inventory" />
            <NavItem label="Suppliers" href="/suppliers" />
            <NavItem label="Purchase Orders" href="/purchase-orders" />
            <NavItem label="Production & Quality" href="/production" />
            <NavItem label="Demand Forecast" href="/demand-forecast" />
            <NavItem label="Risk & Alerts" href="/demand-forecast" />
            <NavItem label="AI Recommendations" href="/demand-forecast" />
            <NavItem label="Analytics" href="/dashboard" />
          </nav>

          <div className="mt-10 border-t border-slate-800 px-6 pt-6">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Platform
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Supply-chain intelligence powered by data, analytics and AI.
            </p>
          </div>
        </aside>

        {/* Main Dashboard */}
        <section className="flex-1 px-6 py-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-400">
              Operations Overview
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              Supply Chain Command Center
            </h2>

            <p className="mt-2 max-w-2xl text-slate-400">
              Open the system and ChainSight has already read your inventory
              position, found the risks and drafted the fixes.
            </p>
          </div>

          {/* AI briefing — analyzes live inventory on load */}
          <AiBriefing />

          {/* Reference metrics */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <InfoCard
              title="Supplier Performance"
              value="94.2%"
              description="On-time delivery rate"
            />

            <InfoCard
              title="Forecast Accuracy"
              value="91.7%"
              description="30-day demand forecast"
            />

            <InfoCard
              title="Open Purchase Orders"
              value="138"
              description="Active procurement"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({
  label,
  href,
  active = false,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-blue-600/15 text-blue-400"
          : "text-slate-400 hover:bg-slate-900 hover:text-white"
      }`}
    >
      {label}
    </a>
  );
}

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
