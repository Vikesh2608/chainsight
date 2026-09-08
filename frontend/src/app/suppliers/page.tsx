"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import ReportBar from "../_components/ReportBar";
import { ParetoChart } from "../_components/charts";
import type { ReportColumn } from "@/lib/reports";

type Supplier = {
  id: string;
  name: string;
  category: string;
  primaryProducts: string;
  leadTime: number;
  onTimeDelivery: number;
  qualityScore: number;
  defectRate: number;
  unitCostIndex: number;
  orders: number;
};

export const supplierData: Supplier[] = [
  {
    id: "SUP-001",
    name: "NVIDIA Supply",
    category: "AI Infrastructure",
    primaryProducts: "GPU Accelerators",
    leadTime: 14,
    onTimeDelivery: 96.4,
    qualityScore: 98.2,
    defectRate: 1.8,
    unitCostIndex: 102,
    orders: 24,
  },
  {
    id: "SUP-002",
    name: "Advanced Components",
    category: "Server Components",
    primaryProducts: "Server CPUs",
    leadTime: 10,
    onTimeDelivery: 93.1,
    qualityScore: 96.7,
    defectRate: 3.3,
    unitCostIndex: 98,
    orders: 20,
  },
  {
    id: "SUP-003",
    name: "Memory Systems",
    category: "Memory",
    primaryProducts: "DDR5 Memory",
    leadTime: 7,
    onTimeDelivery: 97.8,
    qualityScore: 99.1,
    defectRate: 0.9,
    unitCostIndex: 95,
    orders: 31,
  },
  {
    id: "SUP-004",
    name: "Network Hardware",
    category: "Networking",
    primaryProducts: "ConnectX Network Adapters",
    leadTime: 12,
    onTimeDelivery: 91.6,
    qualityScore: 94.8,
    defectRate: 5.2,
    unitCostIndex: 101,
    orders: 18,
  },
  {
    id: "SUP-005",
    name: "Enterprise Storage",
    category: "Storage",
    primaryProducts: "Enterprise SSD",
    leadTime: 9,
    onTimeDelivery: 95.2,
    qualityScore: 97.4,
    defectRate: 2.6,
    unitCostIndex: 97,
    orders: 22,
  },
  {
    id: "SUP-006",
    name: "Signal Technologies",
    category: "PCIe Components",
    primaryProducts: "PCIe Gen5 Retimers",
    leadTime: 18,
    onTimeDelivery: 88.4,
    qualityScore: 92.1,
    defectRate: 7.9,
    unitCostIndex: 94,
    orders: 15,
  },
];

function getSupplierRisk(
  supplier: Supplier
): "Low" | "Medium" | "High" {
  if (
    supplier.onTimeDelivery < 90 ||
    supplier.qualityScore < 93 ||
    supplier.defectRate > 6
  ) {
    return "High";
  }

  if (
    supplier.onTimeDelivery < 95 ||
    supplier.qualityScore < 97 ||
    supplier.defectRate > 3 ||
    supplier.leadTime > 15
  ) {
    return "Medium";
  }

  return "Low";
}

function getRiskClass(risk: "Low" | "Medium" | "High") {
  if (risk === "High") {
    return "bg-red-500/10 text-red-400 border border-red-500/20";
  }

  if (risk === "Medium") {
    return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  }

  return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
}

const supplierReportColumns: ReportColumn[] = [
  { key: "Supplier", label: "Supplier" },
  { key: "Category", label: "Category" },
  { key: "Products", label: "Primary products" },
  { key: "OnTime", label: "On-time delivery %", percent: true },
  { key: "Quality", label: "Quality score %", percent: true },
  { key: "LeadTime", label: "Lead time (days)", numeric: true },
  { key: "DefectRate", label: "Defect rate %", percent: true },
  { key: "Orders", label: "Orders", numeric: true },
  { key: "DefectExposure", label: "Defect exposure", numeric: true },
  { key: "Score", label: "ChainSight score" },
  { key: "Risk", label: "Risk" },
];

function getSupplierScore(supplier: Supplier) {
  const score =
    supplier.onTimeDelivery * 0.35 +
    supplier.qualityScore * 0.35 +
    Math.max(0, 100 - supplier.defectRate * 5) * 0.2 +
    Math.max(0, 100 - supplier.leadTime * 2) * 0.1;

  return Math.round(score * 10) / 10;
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return supplierData.filter((supplier) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        supplier.name.toLowerCase().includes(searchValue) ||
        supplier.category.toLowerCase().includes(searchValue) ||
        supplier.primaryProducts.toLowerCase().includes(searchValue);

      const risk = getSupplierRisk(supplier);

      const matchesRisk =
        riskFilter === "All" || risk === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [search, riskFilter]);

  const totalSuppliers = supplierData.length;

  const highRiskSuppliers = supplierData.filter(
    (supplier) => getSupplierRisk(supplier) === "High"
  ).length;

  const mediumRiskSuppliers = supplierData.filter(
    (supplier) => getSupplierRisk(supplier) === "Medium"
  ).length;

  const averageOnTimeDelivery =
    supplierData.reduce(
      (sum, supplier) => sum + supplier.onTimeDelivery,
      0
    ) / supplierData.length;

  const averageQuality =
    supplierData.reduce(
      (sum, supplier) => sum + supplier.qualityScore,
      0
    ) / supplierData.length;

  const bestSupplier = [...supplierData].sort(
    (a, b) => getSupplierScore(b) - getSupplierScore(a)
  )[0];

  /* Report data — follows the current search / risk filter. */
  const supplierReportRows = filteredSuppliers.map((supplier) => ({
    Supplier: supplier.name,
    Category: supplier.category,
    Products: supplier.primaryProducts,
    OnTime: supplier.onTimeDelivery,
    Quality: supplier.qualityScore,
    LeadTime: supplier.leadTime,
    DefectRate: supplier.defectRate,
    Orders: supplier.orders,
    DefectExposure: Math.round(supplier.orders * supplier.defectRate),
    Score: getSupplierScore(supplier),
    Risk: getSupplierRisk(supplier),
  }));

  const supplierReportSummary = [
    { label: "Active suppliers", value: String(totalSuppliers) },
    {
      label: "Avg on-time",
      value: `${averageOnTimeDelivery.toFixed(1)}%`,
    },
    { label: "Avg quality", value: `${averageQuality.toFixed(1)}%` },
    { label: "High risk", value: String(highRiskSuppliers) },
  ];

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-400">
              ChainSight / Suppliers
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Supplier Management
            </h1>

            <p className="mt-2 max-w-3xl text-slate-400">
              Monitor supplier performance, quality, delivery reliability,
              lead times and operational risk.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ReportBar
              fileBase="chainsight-suppliers"
              title="Supplier Performance Report"
              subtitle="Delivery, quality, cost and risk by supplier"
              columns={supplierReportColumns}
              rows={supplierReportRows}
              summary={supplierReportSummary}
              pareto={{
                title: "Defect exposure by supplier",
                labelKey: "Supplier",
                valueKey: "DefectExposure",
              }}
            />

            <button
              onClick={() =>
                toast.message("Supplier onboarding workflow is coming next.")
              }
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + Add Supplier
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl border border-slate-800 bg-[#0b1224] p-6">
            <p className="text-sm text-slate-400">
              Active Suppliers
            </p>

            <p className="mt-3 text-3xl font-bold">
              {totalSuppliers}
            </p>

            <p className="mt-2 text-sm text-emerald-400">
              Across active categories
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0b1224] p-6">
            <p className="text-sm text-slate-400">
              Avg. On-Time Delivery
            </p>

            <p className="mt-3 text-3xl font-bold">
              {averageOnTimeDelivery.toFixed(1)}%
            </p>

            <p className="mt-2 text-sm text-emerald-400">
              Supplier reliability
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0b1224] p-6">
            <p className="text-sm text-slate-400">
              High Risk Suppliers
            </p>

            <p className="mt-3 text-3xl font-bold text-red-400">
              {highRiskSuppliers}
            </p>

            <p className="mt-2 text-sm text-red-400">
              Immediate attention
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0b1224] p-6">
            <p className="text-sm text-slate-400">
              Avg. Quality Score
            </p>

            <p className="mt-3 text-3xl font-bold">
              {averageQuality.toFixed(1)}%
            </p>

            <p className="mt-2 text-sm text-cyan-400">
              Supplier quality
            </p>
          </div>

        </div>

        {/* SUPPLIER INTELLIGENCE */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0b1224] p-6">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-400">
                  Supplier Intelligence
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Recommended Supplier
                </h2>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                BEST SCORE
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">
                <p className="text-xs text-slate-500">
                  Supplier
                </p>

                <p className="mt-2 font-semibold">
                  {bestSupplier.name}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">
                <p className="text-xs text-slate-500">
                  Score
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {getSupplierScore(bestSupplier)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">
                <p className="text-xs text-slate-500">
                  On-Time
                </p>

                <p className="mt-2 text-xl font-bold">
                  {bestSupplier.onTimeDelivery}%
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">
                <p className="text-xs text-slate-500">
                  Lead Time
                </p>

                <p className="mt-2 text-xl font-bold">
                  {bestSupplier.leadTime} days
                </p>
              </div>

            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400">
              ChainSight evaluates delivery reliability, quality,
              defect rate and lead time to identify the strongest
              supplier for operational decisions.
            </p>

          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-[#0b1224] p-6">

            <p className="text-sm text-yellow-400">
              Supplier Risk
            </p>

            <p className="mt-2 text-3xl font-bold">
              {highRiskSuppliers + mediumRiskSuppliers}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Suppliers requiring monitoring
            </p>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  High Risk
                </span>

                <span className="font-semibold text-red-400">
                  {highRiskSuppliers}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{
                    width: `${(highRiskSuppliers / totalSuppliers) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Medium Risk
                </span>

                <span className="font-semibold text-yellow-400">
                  {mediumRiskSuppliers}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-yellow-500"
                  style={{
                    width: `${(mediumRiskSuppliers / totalSuppliers) * 100}%`,
                  }}
                />
              </div>

            </div>

          </div>

        </div>

        {/* SEARCH */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-[#0b1224] p-4">

          <div className="flex flex-col gap-3 md:flex-row">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search supplier, category, or product..."
              className="flex-1 rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
              className="rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>

          </div>

        </div>

        {/* SUPPLIER TABLE */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1224]">

          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-bold">
              Supplier Performance Register
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Compare supplier reliability, quality, cost and operational risk.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-800 bg-[#020617]">
                <tr className="text-xs uppercase tracking-wide text-slate-500">

                  <th className="px-6 py-4">
                    Supplier
                  </th>

                  <th className="px-6 py-4">
                    Category
                  </th>

                  <th className="px-6 py-4">
                    On-Time
                  </th>

                  <th className="px-6 py-4">
                    Quality
                  </th>

                  <th className="px-6 py-4">
                    Lead Time
                  </th>

                  <th className="px-6 py-4">
                    Defect Rate
                  </th>

                  <th className="px-6 py-4">
                    Score
                  </th>

                  <th className="px-6 py-4">
                    Risk
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredSuppliers.map((supplier) => {
                  const risk = getSupplierRisk(supplier);

                  return (
                    <tr
                      key={supplier.id}
                      className="border-b border-slate-800 transition hover:bg-slate-900/50"
                    >

                      <td className="px-6 py-5">
                        <p className="font-semibold">
                          {supplier.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {supplier.primaryProducts}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-400">
                        {supplier.category}
                      </td>

                      <td className="px-6 py-5">
                        <span className="font-semibold">
                          {supplier.onTimeDelivery}%
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="font-semibold">
                          {supplier.qualityScore}%
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {supplier.leadTime} days
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={
                            supplier.defectRate > 5
                              ? "font-semibold text-red-400"
                              : "text-slate-300"
                          }
                        >
                          {supplier.defectRate}%
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="font-bold text-cyan-400">
                          {getSupplierScore(supplier)}
                        </span>
                      </td>

                      <td className="px-6 py-5">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(
                            risk
                          )}`}
                        >
                          {risk}
                        </span>

                      </td>

                      <td className="px-6 py-5">

                        <button
                          onClick={() =>
                            setSelectedSupplier(supplier)
                          }
                          className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                        >
                          View
                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

          {filteredSuppliers.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              No suppliers found.
            </div>
          )}

        </div>

        {/* DEFECT PARETO */}
        {filteredSuppliers.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-[#0b1224] p-6">
            <h2 className="text-sm font-bold">
              Where defects concentrate — exposure by supplier
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Defect exposure weights each supplier&rsquo;s order volume by its
              defect rate. Fixing the leftmost suppliers removes most of the
              quality risk.
            </p>
            <div className="mt-4">
              <ParetoChart
                data={supplierReportRows.map((r) => ({
                  label: r.Supplier,
                  value: r.DefectExposure,
                }))}
                valueLabel="Defect exposure"
              />
            </div>
          </div>
        )}

      </div>

      {/* SUPPLIER DETAIL MODAL */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0f172a] p-7 shadow-2xl">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm text-cyan-400">
                  ChainSight Supplier Intelligence
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {selectedSupplier.name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedSupplier.primaryProducts}
                </p>
              </div>

              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  Supplier Score
                </p>

                <p className="mt-2 text-3xl font-bold text-cyan-400">
                  {getSupplierScore(selectedSupplier)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  Risk Level
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getRiskClass(
                    getSupplierRisk(selectedSupplier)
                  )}`}
                >
                  {getSupplierRisk(selectedSupplier)}
                </span>
              </div>

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  On-Time Delivery
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {selectedSupplier.onTimeDelivery}%
                </p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  Quality Score
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {selectedSupplier.qualityScore}%
                </p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  Lead Time
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {selectedSupplier.leadTime} days
                </p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-[#020617] p-5">
                <p className="text-sm text-slate-500">
                  Defect Rate
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {selectedSupplier.defectRate}%
                </p>
              </div>

            </div>

            <div className="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">

              <p className="text-sm font-semibold text-blue-400">
                ChainSight Recommendation
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">

                {getSupplierRisk(selectedSupplier) === "High"
                  ? "Review this supplier before placing additional high-value orders. Delivery and quality indicators require attention."
                  : getSupplierRisk(selectedSupplier) === "Medium"
                    ? "Continue monitoring supplier performance. Consider comparing this supplier with alternatives before increasing order volume."
                    : "Supplier performance is strong. This supplier is a good candidate for continued procurement activity."}

              </p>

            </div>

            <div className="mt-6 flex justify-end">

              <button
                onClick={() => setSelectedSupplier(null)}
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}