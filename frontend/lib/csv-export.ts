function escapeCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))];
  const body = lines.join("\r\n");
  const bom = "\ufeff";
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
