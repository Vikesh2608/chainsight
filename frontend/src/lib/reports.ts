/*
 * Report primitives shared by every data page: column specs, CSV
 * serialisation, a totals row, Pareto aggregation and small download
 * helpers. Pure functions only — no React, no DOM beyond the download
 * helpers, so the API route can reuse the CSV builder too.
 */

export type ReportColumn = {
  key: string;
  label: string;
  /** Sum this column on the totals row. */
  numeric?: boolean;
  /** Format hint for the printed report (values in `rows` stay raw). */
  money?: boolean;
  percent?: boolean;
};

export type ReportRow = Record<string, string | number>;

export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generatedAt(): string {
  return new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/*
 * A TOTAL row: sums every `numeric` column, blanks the rest, and drops
 * the word "TOTAL" into the first column. Returns null when there is
 * nothing to total.
 */
export function totalsRow(
  columns: ReportColumn[],
  rows: ReportRow[]
): ReportRow | null {
  if (rows.length === 0) return null;

  const row: ReportRow = {};
  let first = true;

  for (const column of columns) {
    if (column.numeric) {
      row[column.key] = rows.reduce(
        (sum, r) => sum + (Number(r[column.key]) || 0),
        0
      );
    } else {
      row[column.key] = first ? "TOTAL" : "";
    }
    first = false;
  }

  return row;
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function csvFromRows(
  columns: ReportColumn[],
  rows: ReportRow[]
): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");

  const body = rows
    .map((row) =>
      columns.map((c) => escapeCsv(row[c.key] ?? "")).join(",")
    )
    .join("\n");

  return `${header}\n${body}`;
}

export type ParetoRow = {
  label: string;
  value: number;
  share: number;
  cumulative: number;
};

/*
 * Sort contributions high-to-low and attach each row's share of the
 * total and the running cumulative share. Rows with a value of zero or
 * less are dropped — they carry no Pareto signal.
 */
export function paretoFrom(
  rows: ReportRow[],
  labelKey: string,
  valueKey: string
): ParetoRow[] {
  // Merge rows that share a label (e.g. several POs for one supplier)
  // before ranking, so each contributor appears once.
  const merged = new Map<string, number>();

  for (const row of rows) {
    const label = String(row[labelKey] ?? "");
    const value = Number(row[valueKey]) || 0;
    if (value <= 0) continue;
    merged.set(label, (merged.get(label) ?? 0) + value);
  }

  const points = [...merged.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;

  let running = 0;

  return points.map((p) => {
    running += p.value;
    return {
      label: p.label,
      value: p.value,
      share: Math.round((p.value / total) * 1000) / 10,
      cumulative: Math.round((running / total) * 1000) / 10,
    };
  });
}

/* ---- browser download helpers ---- */

export function downloadBlob(
  filename: string,
  mime: string,
  content: string
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function downloadCsv(
  baseName: string,
  columns: ReportColumn[],
  rows: ReportRow[]
): void {
  downloadBlob(
    `${baseName}-${stamp()}.csv`,
    "text/csv;charset=utf-8",
    csvFromRows(columns, rows)
  );
}
