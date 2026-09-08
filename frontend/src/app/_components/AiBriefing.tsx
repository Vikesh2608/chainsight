"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadInventory } from "@/data/inventory";
import { buildBriefing, type Briefing, type Severity } from "@/lib/insights";
import { createPurchaseOrder } from "@/data/purchaseOrders";
import { exportWorkbook } from "@/lib/exportData";
import { StockRunwayChart, ParetoChart } from "./charts";

type BriefingSource = "claude" | "engine";

/*
 * The Morning Briefing.
 *
 * Runs automatically when the dashboard opens: reads the live
 * inventory position, analyzes it, and shows the manager what
 * is wrong and what to do - in order of urgency.
 */

const severityStyles: Record<
  Severity | "neutral",
  { badge: string; ring: string; text: string; label: string }
> = {
  critical: {
    badge: "bg-red-500/10 text-red-400 border-red-500/30",
    ring: "border-red-500/30",
    text: "text-red-400",
    label: "Act now",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    ring: "border-amber-500/20",
    text: "text-amber-400",
    label: "Prepare order",
  },
  watch: {
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    ring: "border-slate-800",
    text: "text-blue-300",
    label: "Watch",
  },
  healthy: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    ring: "border-slate-800",
    text: "text-emerald-400",
    label: "Healthy",
  },
  neutral: {
    badge: "bg-slate-800 text-slate-300 border-slate-700",
    ring: "border-slate-800",
    text: "text-slate-300",
    label: "",
  },
};

function greeting(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AiBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [source, setSource] = useState<BriefingSource>("engine");
  const [ordered, setOrdered] = useState<Record<string, string>>({});

  // Guards against an older in-flight analysis overwriting a newer one.
  const runId = useRef(0);

  const compute = useCallback(async () => {
    const id = ++runId.current;
    const inventory = loadInventory();

    // Instant local result so the panel is never empty.
    const local = buildBriefing(inventory);

    if (id === runId.current) {
      setBriefing(local);
    }

    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory }),
      });

      if (!response.ok) {
        throw new Error(`Briefing API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        source: BriefingSource;
        briefing: Briefing;
      };

      if (id === runId.current) {
        setBriefing(data.briefing);
        setSource(data.source);
      }
    } catch (error) {
      console.error("Falling back to local briefing:", error);

      if (id === runId.current) {
        setSource("engine");
      }
    } finally {
      if (id === runId.current) {
        setAnalyzing(false);
      }
    }
  }, []);

  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    void compute();
  }, [compute]);

  useEffect(() => {
    // A short pause on first open so the analysis reads as
    // deliberate work rather than a flicker.
    const timer = window.setTimeout(() => void compute(), 450);

    const refresh = () => {
      setAnalyzing(true);
      void compute();
    };

    window.addEventListener("inventory-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("inventory-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [compute]);

  const handleReorder = useCallback(
    (sku: string) => {
      if (!briefing) {
        return;
      }

      const insight = briefing.insights.find((i) => i.sku === sku);

      if (!insight || insight.recommendedOrderQty <= 0) {
        return;
      }

      const delivery = new Date(
        Date.now() + insight.leadTime * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const po = createPurchaseOrder({
        sku: insight.sku,
        product: insight.name,
        supplier: insight.supplier,
        quantity: insight.recommendedOrderQty,
        unitCost: insight.unitCost,
        totalCost: insight.recommendedOrderQty * insight.unitCost,
        leadTime: insight.leadTime,
        expectedDelivery: delivery,
        status: "Pending Approval",
      });

      setOrdered((current) => ({
        ...current,
        [sku]: po.poNumber,
      }));

      window.dispatchEvent(new Event("inventory-updated"));
    },
    [briefing]
  );

  const exportBriefing = useCallback(() => {
    if (!briefing) return;

    exportWorkbook("chainsight-briefing", [
      {
        name: "Summary",
        rows: [
          { Field: "Generated", Value: briefing.generatedAt },
          { Field: "Summary", Value: briefing.summary },
          ...briefing.kpis.map((k) => ({ Field: k.label, Value: k.value })),
        ],
      },
      {
        name: "Ranked risks",
        rows: briefing.insights.map((i) => ({
          SKU: i.sku,
          Product: i.name,
          Severity: i.severity,
          "On hand": i.stock,
          "30-day forecast": i.forecast30,
          "Days of cover": i.daysOfCover,
          "Days to stockout": i.daysToStockout,
          "Value at risk": Math.round(i.valueAtRisk),
          "Recommended order qty": i.recommendedOrderQty,
          Supplier: i.supplier,
          Recommendation: i.recommendation,
        })),
      },
    ]);
  }, [briefing]);

  const now = useMemo(() => new Date(), []);

  const criticalCount = briefing
    ? briefing.insights.filter((i) => i.severity === "critical").length
    : 0;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.07] to-slate-900 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-cyan-400">✦</span>

            <h3 className="text-lg font-semibold">
              ChainSight AI — Morning Briefing
            </h3>

            {analyzing && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs text-cyan-300">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                Analyzing inventory…
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-400">
            {greeting(now)}. Here is what needs your attention, ranked by
            urgency.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {!analyzing && (
            <span
              className={`rounded-full border px-2.5 py-0.5 font-medium ${
                source === "claude"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-700 bg-slate-800/60 text-slate-400"
              }`}
            >
              {source === "claude" ? "Narrated by Claude" : "Rule-based engine"}
            </span>
          )}

          {briefing && !analyzing && (
            <span>Updated {formatTime(briefing.generatedAt)}</span>
          )}

          {briefing && briefing.insights.length > 0 && (
            <button
              onClick={() => exportBriefing()}
              className="rounded-md border border-slate-700 px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Export report
            </button>
          )}

          <button
            onClick={() => runAnalysis()}
            className="rounded-md border border-slate-700 px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Re-run
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      {briefing && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {briefing.kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-xs text-slate-500">{kpi.label}</p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  severityStyles[kpi.tone].text || "text-white"
                }`}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* SUMMARY */}
      {briefing && (
        <div
          className={`mt-5 rounded-xl border bg-slate-950/70 p-4 ${
            criticalCount > 0
              ? "border-red-500/30"
              : briefing.healthy
                ? "border-emerald-500/30"
                : "border-amber-500/30"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
            Executive summary
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-200">
            {briefing.summary}
          </p>
        </div>
      )}

      {/* RUNWAY CHART */}
      {briefing && !briefing.healthy && briefing.insights.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Coverage runway — days of stock vs. supplier lead time
          </p>
          <div className="mt-3">
            <StockRunwayChart
              data={briefing.insights.map((i) => ({
                sku: i.sku,
                daysToStockout: i.daysToStockout,
                leadTime: i.leadTime,
              }))}
            />
          </div>
        </div>
      )}

      {/* VALUE-AT-RISK PARETO */}
      {briefing &&
        briefing.insights.filter((i) => i.valueAtRisk > 0).length >= 2 && (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Where the exposure sits — demand value at risk by SKU
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Clearing the leftmost SKUs removes most of the total exposure
            </p>
            <div className="mt-3">
              <ParetoChart
                data={briefing.insights.map((i) => ({
                  label: i.sku,
                  value: Math.round(i.valueAtRisk),
                }))}
                valueLabel="Value at risk"
                unitPrefix="$"
              />
            </div>
          </div>
        )}

      {/* INSIGHTS */}
      {briefing && !briefing.healthy && (
        <div className="mt-5 space-y-3">
          {briefing.insights.map((insight) => {
            const style = severityStyles[insight.severity];
            const poNumber = ordered[insight.sku];

            return (
              <div
                key={insight.id}
                className={`rounded-xl border bg-slate-950/60 p-4 ${style.ring}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
                      >
                        {style.label}
                      </span>

                      <p className="font-semibold text-white">
                        {insight.headline}
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {insight.detail}
                    </p>
                  </div>
                </div>

                {/* METRICS */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {insight.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg bg-slate-900 p-3"
                    >
                      <p className="text-[11px] text-slate-500">
                        {metric.label}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* RECOMMENDATION + ACTION */}
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-blue-400">
                      Recommended action
                    </p>

                    <p className="mt-1 text-sm text-slate-200">
                      {insight.recommendation}
                    </p>
                  </div>

                  {insight.recommendedOrderQty > 0 &&
                    (poNumber ? (
                      <span className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400">
                        {poNumber} created — pending approval
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReorder(insight.sku)}
                        className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                      >
                        Create purchase order · {insight.recommendedOrderQty}{" "}
                        units
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HEALTHY STATE */}
      {briefing && briefing.healthy && !analyzing && (
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-sm text-emerald-300">
          Nothing needs a decision today. ChainSight will flag SKUs here the
          moment stock drops toward a stockout.
        </div>
      )}
    </section>
  );
}
