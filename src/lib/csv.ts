/** ADM-03: Excel-compatible UTF-8 CSV; neutralize untrusted spreadsheet formulas. */
export type CsvValue = string | number | boolean | null;

export function csvCell(value: CsvValue): string {
  const text = value === null ? "" : String(value);
  // Whitespace/BOM prefixes must not disguise a formula when Excel trims a cell.
  const prefix = /^[\t\r\n]/.test(text) || /^[\s\uFEFF]*[=+\-@]/u.test(text) ? "'" : "";
  return '"' + prefix + text.replaceAll('"', '""') + '"';
}

export function csvDocument(columns: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return "\uFEFF" + [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
