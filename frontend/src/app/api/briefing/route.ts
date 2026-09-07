import Anthropic from "@anthropic-ai/sdk";

import type { InventoryItem } from "@/data/inventory";
import { buildBriefing, type Briefing } from "@/lib/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/briefing
 *
 * Body: { inventory: InventoryItem[] }
 *
 * The deterministic engine (src/lib/insights.ts) does the analysis
 * and owns every number. If ANTHROPIC_API_KEY is set, Claude rewrites
 * the prose - summary and each insight's headline / detail /
 * recommendation - into a sharper manager briefing. If the key is
 * missing or the call fails, the engine's own wording is returned.
 */

const MODEL = process.env.CHAINSIGHT_BRIEFING_MODEL || "claude-opus-5";

type NarratedInsight = {
  sku: string;
  headline: string;
  detail: string;
  recommendation: string;
};

type Narration = {
  summary: string;
  insights: NarratedInsight[];
};

function isInventoryArray(value: unknown): value is InventoryItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as InventoryItem).sku === "string"
    )
  );
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object in model response");
  }

  return JSON.parse(raw.slice(start, end + 1));
}

async function narrate(briefing: Briefing): Promise<Narration> {
  const client = new Anthropic();

  const payload = {
    summary: briefing.summary,
    insights: briefing.insights.map((insight) => ({
      sku: insight.sku,
      name: insight.name,
      severity: insight.severity,
      supplier: insight.supplier,
      recommendedOrderQty: insight.recommendedOrderQty,
      valueAtRisk: Math.round(insight.valueAtRisk),
      leadTimeDays: insight.leadTime,
      facts: insight.metrics
        .map((metric) => `${metric.label}: ${metric.value}`)
        .join(", "),
      engineHeadline: insight.headline,
      engineDetail: insight.detail,
      engineRecommendation: insight.recommendation,
    })),
  };

  const system =
    "You are a supply-chain analyst writing the morning briefing for an " +
    "operations manager who has just opened their dashboard. Rewrite the " +
    "provided analysis into clear, direct prose. Rules: use only the numbers " +
    "and facts given - never invent SKUs, quantities, suppliers or dates; " +
    "lead with stockout risk; keep each `detail` to one or two sentences; " +
    "make each `recommendation` a single concrete next step; no markdown, no " +
    "bullet characters, no preamble. Respond with a single JSON object only, " +
    'shaped as {"summary": string, "insights": [{"sku": string, "headline": ' +
    'string, "detail": string, "recommendation": string}]}. Include one entry ' +
    "per SKU in the input, keyed by the same sku string.";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const parsed = extractJson(text) as Narration;

  if (
    !parsed ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.insights)
  ) {
    throw new Error("Model response did not match the expected shape");
  }

  return parsed;
}

function merge(briefing: Briefing, narration: Narration): Briefing {
  const bySku = new Map(
    narration.insights
      .filter((entry) => entry && typeof entry.sku === "string")
      .map((entry) => [entry.sku, entry])
  );

  return {
    ...briefing,
    summary: narration.summary.trim() || briefing.summary,
    insights: briefing.insights.map((insight) => {
      const narrated = bySku.get(insight.sku);

      if (!narrated) {
        return insight;
      }

      return {
        ...insight,
        headline: narrated.headline?.trim() || insight.headline,
        detail: narrated.detail?.trim() || insight.detail,
        recommendation:
          narrated.recommendation?.trim() || insight.recommendation,
      };
    }),
  };
}

export async function POST(request: Request) {
  let inventory: InventoryItem[];

  try {
    const body = await request.json();

    if (!isInventoryArray(body?.inventory)) {
      return Response.json(
        { error: "Body must be { inventory: InventoryItem[] }" },
        { status: 400 }
      );
    }

    inventory = body.inventory;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const briefing = buildBriefing(inventory);

  if (!process.env.ANTHROPIC_API_KEY || briefing.insights.length === 0) {
    return Response.json({ source: "engine", briefing });
  }

  try {
    const narration = await narrate(briefing);

    return Response.json({
      source: "claude",
      model: MODEL,
      briefing: merge(briefing, narration),
    });
  } catch (error) {
    console.error("Briefing narration failed, using engine output:", error);

    return Response.json({ source: "engine", briefing });
  }
}
