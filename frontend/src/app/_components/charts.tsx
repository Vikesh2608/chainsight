"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fill: "#64748b", fontSize: 11 };
const GRID = "#1e293b";

const tooltipProps = {
  contentStyle: {
    background: "#0b1220",
    border: "1px solid #1e293b",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#e2e8f0" },
  cursor: { fill: "rgba(148,163,184,0.08)" },
};

function riskColor(daysToStockout: number, leadTime: number): string {
  if (daysToStockout <= leadTime) return "#f87171"; // red
  if (daysToStockout <= leadTime * 1.6) return "#fbbf24"; // amber
  return "#34d399"; // green
}

/*
 * Days of stock left per SKU, against the average supplier lead time.
 * Bars that fall left of the line will stock out before a reorder lands.
 */
export function StockRunwayChart({
  data,
}: {
  data: { sku: string; daysToStockout: number; leadTime: number }[];
}) {
  if (data.length === 0) return null;

  const avgLead =
    data.reduce((s, d) => s + d.leadTime, 0) / data.length;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS}
            stroke={GRID}
            unit="d"
          />
          <YAxis
            type="category"
            dataKey="sku"
            tick={AXIS}
            stroke={GRID}
            width={90}
          />
          <Tooltip
            {...tooltipProps}
            formatter={(value) => `${Number(value)} days of cover`}
          />
          <ReferenceLine
            x={avgLead}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            label={{
              value: `avg lead time ${avgLead.toFixed(0)}d`,
              fill: "#38bdf8",
              fontSize: 10,
              position: "top",
            }}
          />
          <Bar dataKey="daysToStockout" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((d) => (
              <Cell
                key={d.sku}
                fill={riskColor(d.daysToStockout, d.leadTime)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/*
 * Current stock vs projected 30-day demand, per SKU.
 */
export function StockVsForecastChart({
  data,
}: {
  data: { sku: string; stock: number; forecast: number }[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="sku" tick={AXIS} stroke={GRID} interval={0} />
          <YAxis tick={AXIS} stroke={GRID} />
          <Tooltip {...tooltipProps} />
          <Bar
            dataKey="stock"
            name="On hand"
            fill="#22d3ee"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="forecast"
            name="30-day demand"
            fill="#475569"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/*
 * First-pass yield per production order, against a 95% target.
 */
export function YieldChart({
  data,
}: {
  data: { id: string; yield: number }[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="id" tick={AXIS} stroke={GRID} interval={0} />
          <YAxis
            tick={AXIS}
            stroke={GRID}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            {...tooltipProps}
            formatter={(value) =>
              `${Number(value).toFixed(1)}% first-pass yield`
            }
          />
          <ReferenceLine
            y={95}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            label={{
              value: "target 95%",
              fill: "#38bdf8",
              fontSize: 10,
              position: "right",
            }}
          />
          <Bar dataKey="yield" radius={[3, 3, 0, 0]} barSize={34}>
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={
                  d.yield >= 97
                    ? "#34d399"
                    : d.yield >= 90
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/*
 * Pareto: contributions sorted high-to-low, with a cumulative-%
 * line and an 80% reference. Shows how concentrated a total is.
 */
export function ParetoChart({
  data,
  valueLabel = "Value",
  unitPrefix = "",
}: {
  data: { label: string; value: number }[];
  valueLabel?: string;
  unitPrefix?: string;
}) {
  const sorted = [...data]
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length === 0) return null;

  const total = sorted.reduce((s, d) => s + d.value, 0);

  let running = 0;
  const rows = sorted.map((d) => {
    running += d.value;
    return {
      label: d.label,
      value: d.value,
      cumulative: Math.round((running / total) * 100),
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} stroke={GRID} interval={0} />
          <YAxis yAxisId="left" tick={AXIS} stroke={GRID} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            tick={AXIS}
            stroke={GRID}
          />
          <Tooltip
            {...tooltipProps}
            formatter={(value, name) =>
              name === "cumulative"
                ? [`${Number(value)}%`, "Cumulative"]
                : [`${unitPrefix}${Number(value).toLocaleString()}`, valueLabel]
            }
          />
          <ReferenceLine
            yAxisId="right"
            y={80}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            label={{
              value: "80%",
              fill: "#38bdf8",
              fontSize: 10,
              position: "right",
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="value"
            fill="#22d3ee"
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f59e0b" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
