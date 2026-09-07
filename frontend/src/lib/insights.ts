import type { InventoryItem } from "@/data/inventory";

/*
 * ChainSight insight engine.
 *
 * Pure functions. Given the current inventory position, this
 * produces a ranked, plain-language briefing a manager can act
 * on the moment they open the dashboard - no clicking required.
 *
 * The engine is deterministic today. A language model can later
 * be layered on top of the same `analyzeItem` output to phrase
 * the narrative; the numbers and recommendations stay here.
 */

export type Severity = "critical" | "warning" | "watch" | "healthy";

export type ItemAnalysis = {
  item: InventoryItem;
  dailyDemand: number;
  leadTimeDemand: number;
  daysOfCover: number;
  daysToStockout: number;
  projectedStock30: number;
  unmetDemand30: number;
  valueAtRisk: number;
  recommendedOrderQty: number;
  stocksOutBeforeResupply: boolean;
  severity: Severity;
};

export type Insight = {
  id: string;
  sku: string;
  name: string;
  supplier: string;
  severity: Severity;
  headline: string;
  detail: string;
  recommendation: string;
  recommendedOrderQty: number;
  unitCost: number;
  leadTime: number;
  valueAtRisk: number;
  stock: number;
  forecast30: number;
  daysOfCover: number;
  daysToStockout: number;
  metrics: { label: string; value: string }[];
};

export type Briefing = {
  generatedAt: string;
  summary: string;
  healthy: boolean;
  kpis: { label: string; value: string; tone: Severity | "neutral" }[];
  insights: Insight[];
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  watch: 2,
  healthy: 3,
};

function round(value: number): number {
  return Math.round(value);
}

function currency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }

  return `$${round(value)}`;
}

export function analyzeItem(item: InventoryItem): ItemAnalysis {
  const dailyDemand = item.forecast30 > 0 ? item.forecast30 / 30 : 0;

  const leadTimeDemand = Math.ceil(dailyDemand * item.leadTime);

  const daysOfCover =
    dailyDemand > 0 ? item.stock / dailyDemand : Number.POSITIVE_INFINITY;

  const daysToStockout =
    dailyDemand > 0
      ? Math.max(0, Math.floor(item.stock / dailyDemand))
      : Number.POSITIVE_INFINITY;

  const projectedStock30 = item.stock - item.forecast30;

  const unmetDemand30 = Math.max(0, item.forecast30 - item.stock);

  const valueAtRisk = unmetDemand30 * item.unitCost;

  // Cover lead-time demand plus the reorder point as a safety buffer.
  const target = Math.max(
    item.forecast30,
    leadTimeDemand + item.reorderPoint
  );

  const recommendedOrderQty = Math.max(0, round(target - item.stock));

  const stocksOutBeforeResupply =
    dailyDemand > 0 && item.stock < leadTimeDemand;

  let severity: Severity = "healthy";

  if (item.stock <= 0) {
    severity = "critical";
  } else if (stocksOutBeforeResupply) {
    severity = "critical";
  } else if (item.stock < item.reorderPoint) {
    severity = "warning";
  } else if (item.stock < item.forecast30) {
    severity = "warning";
  } else if (daysOfCover < 30) {
    severity = "watch";
  }

  return {
    item,
    dailyDemand,
    leadTimeDemand,
    daysOfCover,
    daysToStockout,
    projectedStock30,
    unmetDemand30,
    valueAtRisk,
    recommendedOrderQty,
    stocksOutBeforeResupply,
    severity,
  };
}

function buildInsight(analysis: ItemAnalysis): Insight {
  const { item } = analysis;

  const coverText = Number.isFinite(analysis.daysOfCover)
    ? `${round(analysis.daysOfCover)} days of cover`
    : "no forecast demand";

  const stockoutText = Number.isFinite(analysis.daysToStockout)
    ? `runs out in ~${analysis.daysToStockout} days`
    : "is not depleting";

  let headline: string;
  let detail: string;
  let recommendation: string;

  if (analysis.severity === "critical") {
    headline =
      item.stock <= 0
        ? `${item.sku} is out of stock`
        : `${item.sku} will stock out before a reorder can arrive`;

    detail =
      `Current stock is ${item.stock} units against a 30-day forecast of ` +
      `${item.forecast30} units (${stockoutText}). The supplier lead time is ` +
      `${item.leadTime} days, which covers about ${analysis.leadTimeDemand} ` +
      `units of demand - more than what is on hand. Roughly ` +
      `${currency(analysis.valueAtRisk)} of demand is exposed.`;

    recommendation =
      `Raise a purchase order for ${analysis.recommendedOrderQty} units with ` +
      `${item.supplier} today.`;
  } else if (analysis.severity === "warning") {
    headline = `${item.sku} is trending below its reorder point`;

    detail =
      `Stock is ${item.stock} units with ${coverText}. The 30-day forecast ` +
      `is ${item.forecast30} units and the reorder point is ` +
      `${item.reorderPoint}. Left alone, inventory drops to ` +
      `${analysis.projectedStock30} units within the month.`;

    recommendation =
      analysis.recommendedOrderQty > 0
        ? `Prepare a purchase order for ~${analysis.recommendedOrderQty} units ` +
          `with ${item.supplier}.`
        : `Monitor daily; no order needed yet.`;
  } else {
    headline = `${item.sku} is worth watching`;

    detail =
      `Stock is ${item.stock} units with ${coverText}. It is above the ` +
      `reorder point but demand of ${item.forecast30} units over 30 days ` +
      `will narrow the buffer.`;

    recommendation = `No action now. Re-check at the next briefing.`;
  }

  return {
    id: item.sku,
    sku: item.sku,
    name: item.name,
    supplier: item.supplier,
    severity: analysis.severity,
    headline,
    detail,
    recommendation,
    recommendedOrderQty: analysis.recommendedOrderQty,
    unitCost: item.unitCost,
    leadTime: item.leadTime,
    valueAtRisk: analysis.valueAtRisk,
    stock: item.stock,
    forecast30: item.forecast30,
    daysOfCover: Number.isFinite(analysis.daysOfCover)
      ? round(analysis.daysOfCover)
      : 999,
    daysToStockout: Number.isFinite(analysis.daysToStockout)
      ? analysis.daysToStockout
      : 999,
    metrics: [
      { label: "On hand", value: `${item.stock} units` },
      { label: "30-day forecast", value: `${item.forecast30} units` },
      {
        label: "Days of cover",
        value: Number.isFinite(analysis.daysOfCover)
          ? `${round(analysis.daysOfCover)} days`
          : "-",
      },
      { label: "Lead time", value: `${item.leadTime} days` },
    ],
  };
}

function buildSummary(
  analyses: ItemAnalysis[],
  insights: Insight[]
): string {
  const critical = insights.filter((i) => i.severity === "critical");
  const warning = insights.filter((i) => i.severity === "warning");

  const totalAtRisk = analyses.reduce((sum, a) => sum + a.valueAtRisk, 0);

  if (critical.length === 0 && warning.length === 0) {
    return (
      `All ${analyses.length} tracked SKUs are above their reorder points ` +
      `with enough cover to outlast supplier lead times. No procurement ` +
      `action is needed right now.`
    );
  }

  const parts: string[] = [];

  if (critical.length > 0) {
    const names = critical.map((i) => i.sku).join(", ");
    const many = critical.length > 1;

    parts.push(
      `${critical.length} SKU${many ? "s" : ""} ${many ? "need" : "needs"} ` +
        `action now - ${names} will run out before a replacement order can ` +
        `land.`
    );
  }

  if (warning.length > 0) {
    parts.push(
      `${warning.length} more ${
        warning.length > 1 ? "are" : "is"
      } trending toward the reorder point.`
    );
  }

  if (totalAtRisk > 0) {
    parts.push(
      `About ${currency(totalAtRisk)} of forecast demand is exposed until ` +
        `stock is replenished.`
    );
  }

  const topFix = critical[0] ?? warning[0];

  if (topFix && topFix.recommendedOrderQty > 0) {
    parts.push(
      `Start with a purchase order for ${topFix.recommendedOrderQty} units of ` +
        `${topFix.sku} with ${topFix.supplier}.`
    );
  }

  return parts.join(" ");
}

export function buildBriefing(inventory: InventoryItem[]): Briefing {
  const analyses = inventory.map(analyzeItem);

  const ranked = [...analyses].sort((a, b) => {
    const bySeverity =
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];

    if (bySeverity !== 0) {
      return bySeverity;
    }

    return b.valueAtRisk - a.valueAtRisk;
  });

  const insights = ranked
    .filter((a) => a.severity !== "healthy")
    .map(buildInsight);

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + item.stock * item.unitCost,
    0
  );

  const atRiskCount = analyses.filter(
    (a) => a.severity === "critical" || a.severity === "warning"
  ).length;

  const totalAtRisk = analyses.reduce((sum, a) => sum + a.valueAtRisk, 0);

  const soonest = analyses
    .map((a) => a.daysToStockout)
    .filter((d) => Number.isFinite(d))
    .sort((a, b) => a - b)[0];

  const healthy = insights.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: buildSummary(analyses, insights),
    healthy,
    kpis: [
      {
        label: "Inventory value",
        value: currency(inventoryValue),
        tone: "neutral",
      },
      {
        label: "SKUs at risk",
        value: `${atRiskCount}`,
        tone: atRiskCount > 0 ? "warning" : "healthy",
      },
      {
        label: "Demand value exposed",
        value: currency(totalAtRisk),
        tone: totalAtRisk > 0 ? "critical" : "healthy",
      },
      {
        label: "First stockout",
        value:
          soonest === undefined
            ? "-"
            : soonest <= 0
              ? "now"
              : `${soonest} days`,
        tone:
          soonest !== undefined && soonest < 14 ? "critical" : "neutral",
      },
    ],
    insights,
  };
}
