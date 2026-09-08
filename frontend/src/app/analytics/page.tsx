"use client";

import { useEffect, useMemo, useState } from "react";

import { loadInventory } from "@/data/inventory";
import { getPurchaseOrders } from "@/data/purchaseOrders";
import {
  getProductionOrders,
  firstPassYield,
  defectRate,
} from "@/data/production";
import { pivot, type Aggregation } from "@/lib/pivot";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import ReportBar from "../_components/ReportBar";
import { TotalsBarChart, ParetoChart } from "../_components/charts";

type Row = Record<string, string | number>;

type Dataset = {
  key: string;
  label: string;
  rows: Row[];
  dims: string[];
  measures: string[];
  money: Set<string>;
  defaults: {
    row1: string;
    row2: string;
    col: string;
    value: string;
    agg: Aggregation;
  };
};

const AGGS: Aggregation[] = ["sum", "avg", "count", "min", "max"];

function inventoryRisk(r: {
  stock: number;
  forecast30: number;
  reorderPoint: number;
}): string {
  if (r.stock < r.reorderPoint) return "High";
  if (r.stock < r.forecast30) return "Medium";
  return "Low";
}

function buildDatasets(): Dataset[] {
  const inventory = loadInventory().map((i) => ({
    SKU: i.sku,
    Product: i.name,
    Category: i.category,
    Supplier: i.supplier,
    Risk: inventoryRisk(i),
    Stock: i.stock,
    Forecast30: i.forecast30,
    ReorderPoint: i.reorderPoint,
    LeadTime: i.leadTime,
    UnitCost: i.unitCost,
    StockValue: i.stock * i.unitCost,
  }));

  const pos = getPurchaseOrders().map((p) => ({
    PO: p.poNumber,
    SKU: p.sku,
    Product: p.product,
    Supplier: p.supplier,
    Status: p.status,
    Quantity: p.quantity,
    UnitCost: p.unitCost,
    TotalCost: p.totalCost,
    LeadTime: p.leadTime,
  }));

  const prod = getProductionOrders().map((o) => ({
    Order: o.id,
    SKU: o.sku,
    Product: o.product,
    WorkCenter: o.workCenter,
    Status: o.status,
    Disposition: o.disposition,
    QtyPlanned: o.quantityPlanned,
    QtyProduced: o.quantityProduced,
    Inspected: o.inspectedQty,
    Passed: o.passedQty,
    Failed: o.failedQty,
    YieldPct: Number(firstPassYield(o).toFixed(1)),
    DefectPct: Number(defectRate(o).toFixed(1)),
  }));

  return [
    {
      key: "inventory",
      label: "Inventory",
      rows: inventory,
      dims: ["Category", "Supplier", "Risk", "SKU", "Product"],
      measures: [
        "Stock",
        "Forecast30",
        "ReorderPoint",
        "LeadTime",
        "UnitCost",
        "StockValue",
      ],
      money: new Set(["UnitCost", "StockValue"]),
      defaults: {
        row1: "Category",
        row2: "",
        col: "Risk",
        value: "StockValue",
        agg: "sum",
      },
    },
    {
      key: "purchaseOrders",
      label: "Purchase Orders",
      rows: pos,
      dims: ["Supplier", "Status", "SKU", "Product"],
      measures: ["Quantity", "UnitCost", "TotalCost", "LeadTime"],
      money: new Set(["UnitCost", "TotalCost"]),
      defaults: {
        row1: "Supplier",
        row2: "",
        col: "Status",
        value: "TotalCost",
        agg: "sum",
      },
    },
    {
      key: "production",
      label: "Production & Quality",
      rows: prod,
      dims: ["WorkCenter", "Status", "Disposition", "SKU", "Product"],
      measures: [
        "QtyPlanned",
        "QtyProduced",
        "Inspected",
        "Passed",
        "Failed",
        "YieldPct",
        "DefectPct",
      ],
      money: new Set(),
      defaults: {
        row1: "WorkCenter",
        row2: "",
        col: "Disposition",
        value: "Failed",
        agg: "sum",
      },
    },
  ];
}

function fmt(n: number, money: boolean): string {
  if (money) return `$${n.toLocaleString()}`;
  return n.toLocaleString();
}

export default function AnalyticsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dsKey, setDsKey] = useState("inventory");
  const [row1, setRow1] = useState("Category");
  const [row2, setRow2] = useState("");
  const [col, setCol] = useState("Risk");
  const [value, setValue] = useState("StockValue");
  const [agg, setAgg] = useState<Aggregation>("sum");

  useEffect(() => {
    setDatasets(buildDatasets());
  }, []);

  const ds = datasets.find((d) => d.key === dsKey);

  function selectDataset(key: string) {
    const next = datasets.find((d) => d.key === key);
    if (!next) return;
    setDsKey(key);
    setRow1(next.defaults.row1);
    setRow2(next.defaults.row2);
    setCol(next.defaults.col);
    setValue(next.defaults.value);
    setAgg(next.defaults.agg);
  }

  const result = useMemo(() => {
    if (!ds) return null;
    const rowFields = [row1, ...(row2 ? [row2] : [])];
    return pivot(ds.rows, {
      rowFields,
      colField: col || undefined,
      valueField: value,
      agg,
    });
  }, [ds, row1, row2, col, value, agg]);

  const isMoney = ds?.money.has(value) && agg !== "count";
  const measureLabel = agg === "count" ? "Count" : `${agg} of ${value}`;

  // Flatten the pivot into a report: one "Group" column (the joined row
  // keys), one column per column-key, and a Total. The TOTAL row is the
  // pivot's own re-aggregated totals, not a naive sum.
  const report = useMemo(() => {
    if (!result || !ds) return null;

    const money = Boolean(isMoney);

    const columns: ReportColumn[] = [
      { key: "Group", label: result.rowFields.join(" / ") || "Group" },
      ...result.colKeys.map((colKey) => ({
        key: colKey,
        label: colKey,
        numeric: true,
        money,
      })),
      { key: "Total", label: "Total", numeric: true, money },
    ];

    const rows: ReportRow[] = result.rows.map((r) => {
      const row: ReportRow = { Group: r.keys.join(" ▸ ") };
      for (const colKey of result.colKeys) row[colKey] = r.cells[colKey] ?? 0;
      row.Total = r.total;
      return row;
    });

    const totals: ReportRow = { Group: "TOTAL" };
    for (const colKey of result.colKeys) {
      totals[colKey] = result.colTotals[colKey] ?? 0;
    }
    totals.Total = result.grandTotal;

    return {
      fileBase: `chainsight-analytics-${ds.key}`,
      columns,
      rows,
      totals,
      summary: [
        { label: "Dataset", value: ds.label },
        { label: "Measure", value: measureLabel },
        { label: "Groups", value: String(result.rows.length) },
        { label: "Grand total", value: fmt(result.grandTotal, money) },
      ],
      pareto: {
        title: `${measureLabel} by ${result.rowFields.join(" / ")}`,
        labelKey: "Group",
        valueKey: "Total",
        unitPrefix: money ? "$" : "",
      },
    };
  }, [result, ds, isMoney, measureLabel]);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm text-cyan-400">ChainSight / Analytics</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Pivot any dataset by up to two row dimensions and a column
                dimension, aggregate a measure, and export the result.
              </p>
            </div>
            {report && (
              <ReportBar
                fileBase={report.fileBase}
                title="Analytics Pivot"
                subtitle={`${ds?.label ?? ""} · ${measureLabel}`}
                columns={report.columns}
                rows={report.rows}
                totals={report.totals}
                summary={report.summary}
                pareto={report.pareto}
              />
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Control label="Dataset">
              <select
                value={dsKey}
                onChange={(e) => selectDataset(e.target.value)}
                className={selectClass}
              >
                {datasets.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Control>

            <Control label="Rows">
              <select
                value={row1}
                onChange={(e) => setRow1(e.target.value)}
                className={selectClass}
              >
                {ds?.dims.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Control>

            <Control label="Then by (optional)">
              <select
                value={row2}
                onChange={(e) => setRow2(e.target.value)}
                className={selectClass}
              >
                <option value="">— none —</option>
                {ds?.dims
                  .filter((f) => f !== row1)
                  .map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
              </select>
            </Control>

            <Control label="Columns (optional)">
              <select
                value={col}
                onChange={(e) => setCol(e.target.value)}
                className={selectClass}
              >
                <option value="">— none —</option>
                {ds?.dims
                  .filter((f) => f !== row1 && f !== row2)
                  .map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
              </select>
            </Control>

            <Control label="Value">
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={selectClass}
              >
                {ds?.measures.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Control>

            <Control label="Aggregation">
              <select
                value={agg}
                onChange={(e) => setAgg(e.target.value as Aggregation)}
                className={selectClass}
              >
                {AGGS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Control>
          </div>
        </div>

        {/* PIVOT TABLE */}
        {result && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="font-semibold capitalize">{measureLabel}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {result.rows.length} groups · grand total{" "}
                {fmt(result.grandTotal, Boolean(isMoney))}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#020617] text-xs uppercase text-slate-500">
                  <tr>
                    {result.rowFields.map((f) => (
                      <th key={f} className="px-5 py-3">
                        {f}
                      </th>
                    ))}
                    {result.colKeys.map((c) => (
                      <th key={c} className="px-5 py-3 text-right">
                        {c}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {result.rows.map((r) => (
                    <tr
                      key={r.keys.join("|")}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      {r.keys.map((k, i) => (
                        <td key={i} className="px-5 py-3 font-medium">
                          {k}
                        </td>
                      ))}
                      {result.colKeys.map((c) => (
                        <td key={c} className="px-5 py-3 text-right text-slate-300">
                          {fmt(r.cells[c] ?? 0, Boolean(isMoney))}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right font-semibold text-cyan-300">
                        {fmt(r.total, Boolean(isMoney))}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-[#020617] font-semibold">
                    <td
                      className="px-5 py-3"
                      colSpan={result.rowFields.length}
                    >
                      Total
                    </td>
                    {result.colKeys.map((c) => (
                      <td key={c} className="px-5 py-3 text-right">
                        {fmt(result.colTotals[c] ?? 0, Boolean(isMoney))}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right text-cyan-300">
                      {fmt(result.grandTotal, Boolean(isMoney))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* CHART */}
        {result && result.rows.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold capitalize">
              {measureLabel} by {result.rowFields.join(" ▸ ")}
            </h2>
            <div className="mt-4">
              <TotalsBarChart
                data={result.rows.map((r) => ({
                  label: r.keys.join(" ▸ "),
                  value: r.total,
                }))}
                unitPrefix={isMoney ? "$" : ""}
              />
            </div>
          </div>
        )}

        {/* PARETO */}
        {result && result.rows.length > 1 && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold capitalize">
              {measureLabel} — Pareto (80/20)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Groups left of the 80% line contribute most of the total
            </p>
            <div className="mt-4">
              <ParetoChart
                data={result.rows.map((r) => ({
                  label: r.keys.join(" ▸ "),
                  value: r.total,
                }))}
                valueLabel={measureLabel}
                unitPrefix={isMoney ? "$" : ""}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const selectClass =
  "w-full rounded-lg border border-slate-700 bg-[#020617] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500";

function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}
