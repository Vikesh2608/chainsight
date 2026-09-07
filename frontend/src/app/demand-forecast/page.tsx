"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getPurchaseOrders,
  savePurchaseOrders,
  createPurchaseOrder,
  type PurchaseOrder,
} from "../../data/purchaseOrders";

import { supplierData } from "../suppliers/page";

type DemandItem = {
  sku: string;
  product: string;
  category: string;
  currentStock: number;
  demand7: number;
  demand30: number;
  demand60: number;
  demand90: number;
  leadTime: number;
  safetyStock: number;
};

const demandData: DemandItem[] = [
  {
    sku: "GPU-2048",
    product: "AI GPU Accelerator",
    category: "AI Infrastructure",
    currentStock: 18,
    demand7: 9,
    demand30: 42,
    demand60: 79,
    demand90: 118,
    leadTime: 14,
    safetyStock: 10,
  },
  {
    sku: "CPU-X900",
    product: "Server CPU",
    category: "Server Components",
    currentStock: 32,
    demand7: 11,
    demand30: 51,
    demand60: 96,
    demand90: 143,
    leadTime: 10,
    safetyStock: 12,
  },
  {
    sku: "MEM-DDR5-64",
    product: "64GB DDR5 Memory",
    category: "Memory",
    currentStock: 74,
    demand7: 19,
    demand30: 88,
    demand60: 168,
    demand90: 246,
    leadTime: 7,
    safetyStock: 20,
  },
  {
    sku: "NIC-CX7",
    product: "ConnectX-7 Network Adapter",
    category: "Networking",
    currentStock: 124,
    demand7: 27,
    demand30: 119,
    demand60: 226,
    demand90: 338,
    leadTime: 12,
    safetyStock: 30,
  },
  {
    sku: "SSD-3.84T",
    product: "3.84TB Enterprise SSD",
    category: "Storage",
    currentStock: 46,
    demand7: 14,
    demand30: 62,
    demand60: 121,
    demand90: 181,
    leadTime: 9,
    safetyStock: 15,
  },
  {
    sku: "RETIMER-G5",
    product: "PCIe Gen5 Retimer",
    category: "PCIe Components",
    currentStock: 21,
    demand7: 8,
    demand30: 35,
    demand60: 68,
    demand90: 101,
    leadTime: 18,
    safetyStock: 12,
  },
];

function calculateDailyDemand(item: DemandItem) {
  return item.demand30 / 30;
}

function calculateLeadTimeDemand(item: DemandItem) {
  return Math.ceil(calculateDailyDemand(item) * item.leadTime);
}

function calculateProjectedStock(item: DemandItem) {
  return item.currentStock - item.demand30;
}

function calculateForecastTrend(item: DemandItem) {
  const recentDailyDemand = item.demand7 / 7;
  const monthlyDailyDemand = item.demand30 / 30;

  if (recentDailyDemand > monthlyDailyDemand * 1.1) {
    return "Increasing";
  }

  if (recentDailyDemand < monthlyDailyDemand * 0.9) {
    return "Decreasing";
  }

  return "Stable";
}

function calculateStockoutRisk(item: DemandItem) {
  const leadTimeDemand = calculateLeadTimeDemand(item);

  if (item.currentStock < leadTimeDemand) {
    return "High";
  }

  if (item.currentStock < leadTimeDemand + item.safetyStock) {
    return "Medium";
  }

  return "Low";
}

function calculateRecommendedOrder(item: DemandItem) {
  const leadTimeDemand = calculateLeadTimeDemand(item);

  return Math.max(
    0,
    leadTimeDemand + item.safetyStock - item.currentStock
  );
}

function generateDecisionExplanation(item: DemandItem) {
  const leadTimeDemand = calculateLeadTimeDemand(item);

  const recommendedOrder = calculateRecommendedOrder(item);

  const risk = calculateStockoutRisk(item);

  const demandGap = Math.max(
    0,
    item.demand30 - item.currentStock
  );

  if (risk === "High") {
    return {
      title: "Immediate Replenishment Recommended",

      explanation:
        `ChainSight recommends replenishment because current inventory ` +
        `of ${item.currentStock} units is below the expected demand ` +
        `exposure. The 30-day forecast is ${item.demand30} units, ` +
        `while approximately ${leadTimeDemand} units are expected ` +
        `during the supplier lead time of ${item.leadTime} days.`,

      action:
        `Create a purchase order for approximately ${recommendedOrder} units.`,

      demandGap,
    };
  }

  if (risk === "Medium") {
    return {
      title: "Inventory Requires Monitoring",

      explanation:
        `Current inventory of ${item.currentStock} units is approaching ` +
        `the projected demand requirement of ${item.demand30} units. ` +
        `Supplier lead time is ${item.leadTime} days, so continued demand ` +
        `could reduce inventory below the desired safety level.`,

      action:
        `Monitor demand and prepare for replenishment if consumption increases.`,

      demandGap,
    };
  }

  return {
    title: "Inventory Position Is Healthy",

    explanation:
      `Current inventory of ${item.currentStock} units provides a ` +
      `healthy position relative to projected 30-day demand of ` +
      `${item.demand30} units and the current supplier lead time.`,

    action:
      "No immediate procurement action is required.",

    demandGap,
  };
}

function calculateForecastAccuracy(item: DemandItem) {
  const historicalAverage =
    (item.demand30 + item.demand60 / 2 + item.demand90 / 3) / 3;

  const recentDemand = item.demand30;

  const difference =
    Math.abs(recentDemand - historicalAverage) /
    Math.max(recentDemand, 1);

  return Math.max(75, Math.min(99.5, 100 - difference * 100));
}

function findBestSupplier(item: DemandItem) {
  const searchText = (
    `${item.sku} ${item.product} ${item.category}`
  ).toLowerCase();

  const candidates = supplierData.filter((supplier) => {
    const products =
      supplier.primaryProducts.toLowerCase();

    if (
      searchText.includes("gpu") ||
      searchText.includes("ai infrastructure")
    ) {
      return products.includes("gpu");
    }

    if (
      searchText.includes("cpu") ||
      searchText.includes("server")
    ) {
      return products.includes("cpu");
    }

    if (
      searchText.includes("memory") ||
      searchText.includes("ddr")
    ) {
      return (
        products.includes("memory") ||
        products.includes("ddr")
      );
    }

    if (
      searchText.includes("network") ||
      searchText.includes("nic")
    ) {
      return (
        products.includes("network") ||
        products.includes("nic")
      );
    }

    if (
      searchText.includes("ssd") ||
      searchText.includes("storage")
    ) {
      return (
        products.includes("storage") ||
        products.includes("ssd")
      );
    }

    if (
      searchText.includes("retimer") ||
      searchText.includes("pcie")
    ) {
      return (
        products.includes("pcie") ||
        products.includes("retimer")
      );
    }

    return false;
  });

  const availableSuppliers =
    candidates.length > 0
      ? candidates
      : supplierData;

  return [...availableSuppliers].sort((a, b) => {
    const scoreA =
      a.onTimeDelivery * 0.4 +
      a.qualityScore * 0.35 +
      (100 - a.defectRate * 10) * 0.15 +
      (100 - a.unitCostIndex) * 0.1;

    const scoreB =
      b.onTimeDelivery * 0.4 +
      b.qualityScore * 0.35 +
      (100 - b.defectRate * 10) * 0.15 +
      (100 - b.unitCostIndex) * 0.1;

    return scoreB - scoreA;
  })[0];
}

function getRisk(item: any): "High" | "Medium" | "Low" {
  const stock = Number(item.stock ?? item.currentStock ?? 0);
  const forecast = Number(item.forecast30 ?? item.demand30 ?? 0);

  if (forecast <= 0) {
    return "Low";
  }

  const stockCoverage = stock / forecast;

  // Less than 50% of forecast demand available
  if (stockCoverage < 0.5) {
    return "High";
  }

  // Between 50% and 90% of forecast demand available
  if (stockCoverage < 0.9) {
    return "Medium";
  }

  // 90% or more of forecast demand available
  return "Low";
}


function createPurchaseOrderFromForecast(item: DemandItem) {
  const existingOrders = getPurchaseOrders();

  /*
   * Use the most recent purchase order for the same SKU
   * to determine the supplier and unit cost.
   */
 const previousOrder = existingOrders.find(
  (order) =>
    order.sku === item.sku &&
    order.unitCost > 0 &&
    order.supplier !== "Recommended Supplier"
);

const supplier =
  previousOrder?.supplier || "Recommended Supplier";

const unitCost =
  previousOrder?.unitCost || 0;

  /*
   * Recommended quantity:
   *
   * 30-day demand
   * + safety stock
   * - current inventory
   *
   * Never create an order for less than 1 unit.
   */
  const recommendedQuantity = Math.max(
    item.demand30 +
      item.safetyStock -
      item.currentStock,
    1
  );

  /*
   * Create the purchase order using the centralized
   * purchase-order system.
   */
  const newPurchaseOrder = createPurchaseOrder({
    sku: item.sku,
    product: item.product,
    supplier,
    quantity: recommendedQuantity,
    unitCost,
    totalCost: recommendedQuantity * unitCost,
    leadTime: item.leadTime,
    expectedDelivery: (() => {
      const deliveryDate = new Date();

      deliveryDate.setDate(
        deliveryDate.getDate() + item.leadTime
      );

      return deliveryDate.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    })(),
    status: "Draft",
  });

  window.dispatchEvent(new Event("inventory-updated"));

  toast.success(`${newPurchaseOrder.poNumber} created for ${item.sku}`);
}

export default function DemandForecastPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedItem, setSelectedItem] =
  useState<DemandItem | null>(null);

  const filteredData = useMemo(() => {
    return demandData.filter((item) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        item.sku.toLowerCase().includes(searchValue) ||
        item.product.toLowerCase().includes(searchValue) ||
        item.category.toLowerCase().includes(searchValue);

      const risk = calculateStockoutRisk(item);

      const matchesRisk =
        riskFilter === "All" || risk === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [search, riskFilter]);

  const totalForecast30 = demandData.reduce(
    (sum, item) => sum + item.demand30,
    0
  );

  const highRisk = demandData.filter(
    (item) => calculateStockoutRisk(item) === "High"
  ).length;

  const mediumRisk = demandData.filter(
    (item) => calculateStockoutRisk(item) === "Medium"
  ).length;

  const increasingDemand = demandData.filter(
    (item) => calculateForecastTrend(item) === "Increasing"
  ).length;

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm text-cyan-400">
            ChainSight / Demand Intelligence
          </p>

          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                Demand Forecasting
              </h1>

              <p className="mt-2 text-slate-400">
                Forecast future demand, identify stockout risk and
                generate inventory planning recommendations.
              </p>
            </div>

            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
              Forecast Engine Active
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 md:grid-cols-4">

          <MetricCard
            title="30-Day Forecast"
            value={`${totalForecast30}`}
            description="Projected unit demand"
          />

          <MetricCard
            title="High Stockout Risk"
            value={`${highRisk}`}
            description="Immediate attention"
            danger
          />

          <MetricCard
            title="Medium Risk"
            value={`${mediumRisk}`}
            description="Monitor closely"
            warning
          />

          <MetricCard
            title="Increasing Demand"
            value={`${increasingDemand}`}
            description="Positive demand trend"
            success
          />

        </div>

        {/* FORECAST ENGINE */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-semibold">
                Forecast Engine
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Search SKUs and analyze demand signals.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              Horizon: 30 Days
            </div>

          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search SKU, product, or category..."
              className="flex-1 rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
            />

            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
              className="rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>

          </div>

        </section>

        {/* DEMAND TABLE */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">

          <div className="border-b border-slate-800 p-6">

            <h2 className="text-xl font-semibold">
              Demand Forecast Register
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Compare historical demand with projected demand
              and inventory requirements.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-[#020617] text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">7D Demand</th>
                  <th className="px-5 py-4">30D Forecast</th>
                  <th className="px-5 py-4">60D Demand</th>
                  <th className="px-5 py-4">Trend</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Risk</th>
                  <th className="px-5 py-4">Action</th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-800">

                {filteredData.map((item) => {

                  const trend =
                    calculateForecastTrend(item);

                  const risk =
                    calculateStockoutRisk(item);

                  return (
                    <tr
                      key={item.sku}
                      className="hover:bg-slate-800/40"
                    >

                      <td className="px-5 py-5">

                        <div className="font-semibold">
                          {item.sku}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.product}
                        </div>

                      </td>

                      <td className="px-5 py-5 font-medium">
                        {item.demand7}
                      </td>

                      <td className="px-5 py-5 font-semibold text-cyan-300">
                        {item.demand30}
                      </td>

                      <td className="px-5 py-5">
                        {item.demand60}
                      </td>

                      <td className="px-5 py-5">
                        <TrendBadge trend={trend} />
                      </td>

                      <td className="px-5 py-5">
                        {item.currentStock}
                      </td>

                      <td className="px-5 py-5">
                        <RiskBadge risk={risk} />
                      </td>

                      <td className="px-5 py-5">

                        <button
  onClick={() => setSelectedItem(item)}
  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
>
  Analyze
</button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        </section>

        {/* INTELLIGENCE SECTION */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">

          {/* FORECAST LOGIC */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

            <p className="text-sm text-cyan-400">
              Forecast Intelligence
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              How ChainSight calculates demand
            </h2>

            <div className="mt-5 space-y-4 text-sm text-slate-400">

              <div>
                <span className="font-semibold text-white">
                  1. Historical Demand
                </span>

                <p className="mt-1">
                  Uses 7, 30, 60 and 90-day demand signals.
                </p>
              </div>

              <div>
                <span className="font-semibold text-white">
                  2. Demand Trend
                </span>

                <p className="mt-1">
                  Compares recent demand against the
                  longer-term average.
                </p>
              </div>

              <div>
                <span className="font-semibold text-white">
                  3. Lead-Time Demand
                </span>

                <p className="mt-1">
                  Calculates expected demand during supplier
                  lead time.
                </p>
              </div>

              <div>
                <span className="font-semibold text-white">
                  4. Safety Stock
                </span>

                <p className="mt-1">
                  Adds protection against demand variability
                  and supply delays.
                </p>
              </div>

            </div>

          </div>

          {/* RECOMMENDATION */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">

            <p className="text-sm text-blue-400">
              Planning Recommendation
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Inventory Planning Signal
            </h2>

            <div className="mt-5 rounded-xl border border-blue-500/20 bg-slate-950 p-5">

              <p className="text-sm text-slate-400">
                Highest priority SKU
              </p>

              <p className="mt-2 text-2xl font-bold">
                GPU-2048
              </p>

              <p className="mt-1 text-sm text-slate-500">
                AI GPU Accelerator
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">

                <InfoBox
                  label="Lead-Time Demand"
                  value={`${calculateLeadTimeDemand(
                    demandData[0]
                  )} units`}
                />

                <InfoBox
                  label="Safety Stock"
                  value={`${demandData[0].safetyStock} units`}
                />

                <InfoBox
                  label="Recommended Order"
                  value={`${calculateRecommendedOrder(
                    demandData[0]
                  )} units`}
                />

                <InfoBox
                  label="Forecast Accuracy"
                  value={`${calculateForecastAccuracy(
                    demandData[0]
                  ).toFixed(1)}%`}
                />

              </div>

            </div>

          </div>

        </section>

      </div>
            {/* DEMAND ANALYSIS MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">

          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-cyan-400">
                  ChainSight AI
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  Demand Analysis
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {(selectedItem as any).sku} —{" "}
                  {(selectedItem as any).name ||
                    (selectedItem as any).product ||
                    "Inventory Item"}
                </p>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="text-2xl font-bold text-slate-400 hover:text-white"
              >
                ×
              </button>

            </div>

            {/* Demand Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  7-Day Demand
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  {(selectedItem as any).demand7 ?? 0} units
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  30-Day Forecast
                </p>

                <p className="mt-2 text-xl font-bold text-cyan-400">
                  {(selectedItem as any).demand30 ?? 0} units
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  60-Day Demand
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  {(selectedItem as any).demand60 ?? 0} units
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Current Stock
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  {(selectedItem as any).currentStock ?? 0} units
                </p>
              </div>

            </div>

            {/* Forecast Analysis */}
            <div className="mt-5 rounded-xl border border-blue-800 bg-blue-950/30 p-5">

              <p className="text-sm font-medium text-blue-400">
                Forecast Intelligence
              </p>

              <h3 className="mt-1 text-xl font-bold text-white">
                Demand Planning Analysis
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                ChainSight compares recent demand, projected demand,
                current inventory and inventory risk to determine the
                recommended planning action.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Demand Trend
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {(selectedItem as any).trend || "Stable"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Inventory Risk
                  </p>

                  <p
                    className={`mt-2 font-semibold ${
                      getRisk(selectedItem as any) === "High"
                        ? "text-red-400"
                        : getRisk(selectedItem as any) === "Medium"
                        ? "text-yellow-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {getRisk(selectedItem as any)}
                  </p>
                </div>

              </div>

            </div>

            {/* Planning Recommendation */}
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-5">

              <p className="text-sm font-medium text-cyan-400">
                Planning Recommendation
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                {(selectedItem as any).sku}
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-4">

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">
                    Forecast
                  </p>

                  <p className="mt-2 text-lg font-bold text-white">
                    {(selectedItem as any).demand30 ?? 0} units
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">
                    Current Stock
                  </p>

                  <p className="mt-2 text-lg font-bold text-white">
                    {(selectedItem as any).currentStock ?? 0} units
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">
                    Demand Gap
                  </p>

                  <p className="mt-2 text-lg font-bold text-blue-400">
                   {Math.max(
  0,
  ((selectedItem as any).demand30 ?? 0) -
    ((selectedItem as any).currentStock ?? 0)
)}{" "}
units
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">
                    Planning Action
                  </p>
              

                  <p className="mt-2 text-lg font-bold text-white">
                    {getRisk(selectedItem as any) === "High"
                      ? "Reorder"
                      : getRisk(selectedItem as any) === "Medium"
                      ? "Monitor"
                      : "Maintain"}
                  </p>

                  {getRisk(selectedItem as any) === "High" && (
  <div className="mt-5">
    <button
      onClick={() =>
        createPurchaseOrderFromForecast(selectedItem as DemandItem)
      }
      className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
    >
      Create Purchase Order
    </button>
  </div>
)}
                </div>

              </div>

            </div>

            {/* SUPPLIER INTELLIGENCE */}
<div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">

  <div className="flex items-center gap-2">
    <span className="text-lg">🏭</span>

    <p className="text-sm font-semibold text-emerald-400">
      Supplier Intelligence
    </p>
  </div>

  {(() => {
    const supplier = findBestSupplier(
      selectedItem as DemandItem
    );

    if (!supplier) {
      return (
        <p className="mt-3 text-sm text-slate-400">
          No suitable supplier was identified for this item.
        </p>
      );
    }

    return (
      <div className="mt-4">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-xs text-slate-500">
              Recommended Supplier
            </p>

            <h3 className="mt-1 text-lg font-bold text-white">
              {supplier.name}
            </h3>
          </div>

          <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
            <p className="text-xs text-emerald-400">
              Preferred
            </p>
          </div>

        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              On-Time Delivery
            </p>

            <p className="mt-1 font-semibold text-white">
              {supplier.onTimeDelivery}%
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Quality Score
            </p>

            <p className="mt-1 font-semibold text-white">
              {supplier.qualityScore}
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Lead Time
            </p>

            <p className="mt-1 font-semibold text-white">
              {supplier.leadTime} days
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Defect Rate
            </p>

            <p className="mt-1 font-semibold text-white">
              {supplier.defectRate}%
            </p>
          </div>

        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">
          ChainSight selected{" "}
          <span className="font-semibold text-white">
            {supplier.name}
          </span>{" "}
          based on supplier delivery performance, quality,
          defect rate and cost competitiveness.
        </p>

      </div>
    );
  })()}

</div>

            {/* DECISION EXPLANATION */}
<div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">

  <div className="flex items-center gap-2">
    <span className="text-lg">💡</span>

    <p className="text-sm font-semibold text-cyan-400">
      Why ChainSight Recommends This
    </p>
  </div>

  {(() => {
    const decision = generateDecisionExplanation(
      selectedItem as DemandItem
    );

    return (
      <div className="mt-4">

        <h3 className="text-lg font-bold text-white">
          {decision.title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {decision.explanation}
        </p>

        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4">

          <p className="text-xs uppercase tracking-wide text-slate-500">
            Recommended Action
          </p>

          <p className="mt-2 text-sm font-medium text-white">
            {decision.action}
          </p>

        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Current Stock
            </p>

            <p className="mt-1 font-semibold text-white">
              {selectedItem?.currentStock ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              30-Day Demand
            </p>

            <p className="mt-1 font-semibold text-white">
              {selectedItem?.demand30 ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Lead-Time Demand
            </p>

            <p className="mt-1 font-semibold text-white">
              {calculateLeadTimeDemand(
                selectedItem as DemandItem
              )}
            </p>
          </div>

          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-slate-500">
              Demand Gap
            </p>

            <p className="mt-1 font-semibold text-cyan-400">
              {decision.demandGap}
            </p>
          </div>

        </div>

      </div>
    );
  })()}

</div>


            {/* Recommendation Message */}
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-5">

              <p className="text-sm font-medium text-slate-400">
                ChainSight Recommendation
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">

                {getRisk(selectedItem as any) === "High" ? (
                  <>
                    <strong className="text-red-400">
                      Immediate attention recommended.
                    </strong>{" "}
                    Current inventory is below the expected demand level.
                    Procurement should review the SKU and consider creating
                    a purchase order.
                  </>
                ) : getRisk(selectedItem as any) === "Medium" ? (
                  <>
                    <strong className="text-yellow-400">
                      Monitor this SKU closely.
                    </strong>{" "}
                    Demand is approaching available inventory and may require
                    replenishment if the trend continues.
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-400">
                      Inventory position is healthy.
                    </strong>{" "}
                    Current stock is sufficient relative to projected demand.
                  </>
                )}

              </p>

            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">

              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Close Analysis
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}


/* =========================
   COMPONENTS
========================= */

function MetricCard({
  title,
  value,
  description,
  danger,
  warning,
  success,
}: {
  title: string;
  value: string;
  description: string;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-slate-900/70 p-5 ${
        danger
          ? "border-red-500/30"
          : warning
          ? "border-yellow-500/30"
          : success
          ? "border-emerald-500/30"
          : "border-slate-800"
      }`}
    >

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-3 text-3xl font-bold ${
          danger
            ? "text-red-400"
            : warning
            ? "text-yellow-400"
            : success
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}


function RiskBadge({
  risk,
}: {
  risk: string;
}) {
  const classes =
    risk === "High"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : risk === "Medium"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {risk}
    </span>
  );
}


function TrendBadge({
  trend,
}: {
  trend: string;
}) {
  const classes =
    trend === "Increasing"
      ? "text-red-400"
      : trend === "Decreasing"
      ? "text-emerald-400"
      : "text-slate-400";

  return (
    <span className={`text-sm font-semibold ${classes}`}>
      {trend}
    </span>
  );
}

function DemandBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = Math.min(
    100,
    Math.max(5, (value / max) * 100)
  );

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-400">
          {label}
        </span>

        <span className="font-semibold text-white">
          {value} units
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}



function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-white">
        {value}
      </p>

    </div>
  );
}