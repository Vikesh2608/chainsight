export type Sheet = {
  name: string;
  rows: Record<string, string | number>[];
};

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/*
 * Download one or more sheets of tabular data as a real .xlsx file.
 * Client-side only. The SheetJS library (~400 KB) is loaded lazily on
 * first use so it never weighs down the initial page load.
 */
export async function exportWorkbook(
  baseName: string,
  sheets: Sheet[]
): Promise<void> {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${baseName}-${stamp()}.xlsx`);
}
