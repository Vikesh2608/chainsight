/*
 * A small, dependency-free pivot engine.
 *
 * Group rows by one or two dimension fields (rows) and optionally a
 * third (columns), aggregate a measure field, and return a matrix
 * with row totals, column totals and a grand total.
 */

export type Aggregation = "sum" | "avg" | "count" | "min" | "max";

export type PivotResult = {
  rowFields: string[];
  colKeys: string[];
  rows: {
    keys: string[]; // one per rowField
    cells: Record<string, number>; // colKey -> value
    total: number;
  }[];
  colTotals: Record<string, number>;
  grandTotal: number;
};

function aggregate(values: number[], agg: Aggregation): number {
  if (agg === "count") return values.length;
  if (values.length === 0) return 0;

  if (agg === "sum") return values.reduce((s, v) => s + v, 0);
  if (agg === "avg")
    return values.reduce((s, v) => s + v, 0) / values.length;
  if (agg === "min") return Math.min(...values);
  if (agg === "max") return Math.max(...values);

  return 0;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pivot(
  data: Record<string, string | number>[],
  opts: {
    rowFields: string[]; // 1-2 fields
    colField?: string; // optional
    valueField: string;
    agg: Aggregation;
  }
): PivotResult {
  const { rowFields, colField, valueField, agg } = opts;

  const colKeySet = new Set<string>();
  // rowKey (joined) -> { keys, buckets: colKey -> number[] }
  const rowMap = new Map<
    string,
    { keys: string[]; buckets: Map<string, number[]> }
  >();

  for (const record of data) {
    const keys = rowFields.map((f) => String(record[f] ?? "—"));
    const rowKey = keys.join(" ▸ ");
    const colKey = colField ? String(record[colField] ?? "—") : "Value";
    colKeySet.add(colKey);

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, { keys, buckets: new Map() });
    }
    const bucket = rowMap.get(rowKey)!;
    if (!bucket.buckets.has(colKey)) bucket.buckets.set(colKey, []);
    bucket.buckets.get(colKey)!.push(Number(record[valueField]) || 0);
  }

  const colKeys = [...colKeySet].sort();

  const rows = [...rowMap.values()]
    .map((r) => {
      const cells: Record<string, number> = {};
      const allValues: number[] = [];

      for (const colKey of colKeys) {
        const vals = r.buckets.get(colKey) ?? [];
        cells[colKey] = round(aggregate(vals, agg));
        allValues.push(...vals);
      }

      return {
        keys: r.keys,
        cells,
        total: round(aggregate(allValues, agg)),
      };
    })
    .sort((a, b) => b.total - a.total);

  const colTotals: Record<string, number> = {};
  const allValuesFlat: number[] = [];

  for (const colKey of colKeys) {
    const vals: number[] = [];
    for (const record of data) {
      const rc = colField ? String(record[colField] ?? "—") : "Value";
      if (rc === colKey) vals.push(Number(record[valueField]) || 0);
    }
    colTotals[colKey] = round(aggregate(vals, agg));
    allValuesFlat.push(...vals);
  }

  return {
    rowFields,
    colKeys,
    rows,
    colTotals,
    grandTotal: round(aggregate(allValuesFlat, agg)),
  };
}
