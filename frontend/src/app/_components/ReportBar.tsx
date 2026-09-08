"use client";

import { useState } from "react";
import { toast } from "sonner";

import { exportWorkbook } from "@/lib/exportData";
import {
  csvFromRows,
  downloadCsv,
  generatedAt,
  paretoFrom,
  stamp,
  totalsRow,
  type ReportColumn,
  type ReportRow,
} from "@/lib/reports";

export type ParetoSpec = {
  title: string;
  labelKey: string;
  valueKey: string;
  unitPrefix?: string;
};

type Props = {
  /** File name stem, e.g. "chainsight-inventory". */
  fileBase: string;
  /** Report heading, used in Excel, print and the email subject. */
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /**
   * Explicit TOTAL row. Supply this when a plain column-sum is wrong
   * (averages, min/max, re-aggregated pivots); otherwise ReportBar sums
   * the `numeric` columns itself.
   */
  totals?: ReportRow;
  /** Headline figures shown on the print sheet and the Summary tab. */
  summary?: { label: string; value: string }[];
  /** Optional 80/20 breakdown built from the same rows. */
  pareto?: ParetoSpec;
};

function formatCell(value: string | number, column: ReportColumn): string {
  if (value === "" || value === null || value === undefined) return "";

  if (typeof value === "number") {
    if (column.money) return `$${value.toLocaleString()}`;
    if (column.percent) return `${value.toLocaleString()}%`;
    return value.toLocaleString();
  }

  return String(value);
}

export default function ReportBar({
  fileBase,
  title,
  subtitle,
  columns,
  rows,
  totals,
  summary,
  pareto,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [sending, setSending] = useState(false);

  const total = totals ?? totalsRow(columns, rows);
  const rowsWithTotal = total ? [...rows, total] : rows;

  const paretoRows = pareto
    ? paretoFrom(rows, pareto.labelKey, pareto.valueKey)
    : [];

  function handleExcel() {
    setMenuOpen(false);

    const sheets: { name: string; rows: ReportRow[] }[] = [
      {
        name: "Data",
        rows: rowsWithTotal.map((row) => {
          const out: ReportRow = {};
          for (const column of columns) out[column.label] = row[column.key] ?? "";
          return out;
        }),
      },
    ];

    const summaryRows: ReportRow[] = [
      { Field: "Report", Value: title },
      { Field: "Generated", Value: generatedAt() },
      { Field: "Rows", Value: rows.length },
      ...(summary ?? []).map((item) => ({
        Field: item.label,
        Value: item.value,
      })),
    ];
    sheets.push({ name: "Summary", rows: summaryRows });

    if (pareto && paretoRows.length > 0) {
      sheets.push({
        name: pareto.title.slice(0, 31),
        rows: paretoRows.map((row) => ({
          Item: row.label,
          Value: row.value,
          "Share %": row.share,
          "Cumulative %": row.cumulative,
        })),
      });
    }

    exportWorkbook(fileBase, sheets);
    toast.success(`${title} exported to Excel`);
  }

  function handleCsv() {
    setMenuOpen(false);
    downloadCsv(fileBase, columns, rowsWithTotal);
    toast.success(`${title} exported to CSV`);
  }

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }

    setSending(true);

    const payload = {
      to: emailTo.trim(),
      subject: `${title} — ${stamp()}`,
      note: emailNote.trim(),
      filename: `${fileBase}-${stamp()}.csv`,
      csv: csvFromRows(columns, rowsWithTotal),
      summary: summary ?? [],
    };

    try {
      const response = await fetch("/api/report/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        sent?: boolean;
        mailto?: string;
        error?: string;
      };

      if (data.sent) {
        toast.success(`Report emailed to ${payload.to}`);
        setEmailOpen(false);
        setEmailNote("");
      } else if (data.mailto) {
        // No mail service configured — hand off to the user's mail client.
        window.location.href = data.mailto;
        toast.message("Opening your email app with the report summary.");
        setEmailOpen(false);
      } else {
        toast.error(data.error || "Could not send the report.");
      }
    } catch {
      toast.error("Could not reach the email service.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-2">
        {/* EXPORT ▾ */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Export ▾
          </button>

          {menuOpen && (
            <>
              <button
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                <button
                  onClick={handleExcel}
                  className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={handleCsv}
                  className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  CSV (.csv)
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setPrinting(true)}
          className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Print
        </button>

        <button
          onClick={() => setEmailOpen(true)}
          className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Email
        </button>
      </div>

      {/* EMAIL MODAL */}
      {emailOpen && (
        <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={handleEmail}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-cyan-400">ChainSight</p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Email this report
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sends {title} as a CSV attachment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <label className="mt-5 block text-sm text-slate-400">
              Recipient
            </label>
            <input
              type="email"
              required
              value={emailTo}
              onChange={(event) => setEmailTo(event.target.value)}
              placeholder="name@company.com"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            />

            <label className="mt-4 block text-sm text-slate-400">
              Note (optional)
            </label>
            <textarea
              value={emailNote}
              onChange={(event) => setEmailNote(event.target.value)}
              rows={3}
              placeholder="Context for whoever opens this…"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT PREVIEW OVERLAY */}
      {printing && (
        <div
          id="chainsight-print"
          className="fixed inset-0 z-[70] overflow-auto bg-white text-slate-900"
        >
          <div className="mx-auto max-w-5xl p-10">
            <div className="no-print mb-6 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Print now
              </button>
              <button
                onClick={() => setPrinting(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close preview
              </button>
            </div>

            <header className="border-b-2 border-slate-900 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                ChainSight
              </p>
              <h1 className="mt-1 text-2xl font-bold">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Generated {generatedAt()} · {rows.length} rows
              </p>
            </header>

            {summary && summary.length > 0 && (
              <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-300 p-3"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </section>
            )}

            <table className="mt-6 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-400">
                  {columns.map((column) => (
                    <th key={column.key} className="px-2 py-2 font-semibold">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsWithTotal.map((row, index) => (
                  <tr
                    key={index}
                    className={
                      total && index === rowsWithTotal.length - 1
                        ? "border-t-2 border-slate-900 font-bold"
                        : "border-b border-slate-200"
                    }
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-2 py-1.5">
                        {formatCell(row[column.key], column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {pareto && paretoRows.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {pareto.title}
                </h2>
                <table className="mt-2 w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-400">
                      <th className="px-2 py-2 font-semibold">Item</th>
                      <th className="px-2 py-2 font-semibold">Value</th>
                      <th className="px-2 py-2 font-semibold">Share</th>
                      <th className="px-2 py-2 font-semibold">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paretoRows.map((row) => (
                      <tr
                        key={row.label}
                        className={
                          row.cumulative <= 80
                            ? "border-b border-slate-200 font-semibold"
                            : "border-b border-slate-200 text-slate-600"
                        }
                      >
                        <td className="px-2 py-1.5">{row.label}</td>
                        <td className="px-2 py-1.5">
                          {pareto.unitPrefix ?? ""}
                          {row.value.toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5">{row.share}%</td>
                        <td className="px-2 py-1.5">{row.cumulative}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">
                  Rows up to the 80% cumulative mark are the vital few — clearing
                  them removes most of the total.
                </p>
              </section>
            )}

            <footer className="mt-10 border-t border-slate-300 pt-3 text-[11px] text-slate-500">
              ChainSight · Supply Chain Intelligence · {generatedAt()}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
