import { safeExportCell } from "./normalise";
import type { AppData, MatchRecord, StaffRecord, TimetableRecord } from "./types";

export type ExportRow = {
  Subject: string;
  Teacher: string;
  "Tel. No.": string;
  "Email Address": string;
};

export function previewRows(data: AppData): ExportRow[] {
  return data.timetable
    .filter((record) => record.included)
    .map((record) => {
      const match = data.matches.find((item) => item.timetable_record_id === record.id);
      const staff = match?.staff_record_id ? data.staff.find((item) => item.id === match.staff_record_id) : undefined;
      return rowFrom(record, match, staff);
    });
}

export function csvContent(rows: ExportRow[]) {
  const headers = ["Subject", "Teacher", "Tel. No.", "Email Address"] as const;
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${safeExportCell(row[header]).replace(/"/g, "\"\"")}"`)
        .join(","),
    ),
  ].join("\n");
}

export async function exportXlsx(rows: ExportRow[], filename: string) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows.map(sanitiseRow));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teacher Contacts");
  XLSX.writeFile(workbook, filename);
}

export async function exportDocx(rows: ExportRow[], filename: string) {
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const headers = ["Subject", "Teacher", "Tel. No.", "Email Address"];
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              shading: { fill: "D9D9D9" },
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: headers.map((header) => new TableCell({ children: [new Paragraph(String(row[header as keyof ExportRow] ?? ""))] })),
          }),
      ),
    ],
  });
  const doc = new Document({ sections: [{ children: [table] }] });
  downloadBlob(await Packer.toBlob(doc), filename);
}

export async function exportPdf(rows: ExportRow[], filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Teacher Contact Table", 14, 16);
  let y = 28;
  for (const row of rows) {
    doc.setFontSize(10);
    doc.text(`${row.Subject} | ${row.Teacher} | ${row["Tel. No."]} | ${row["Email Address"]}`, 14, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
  }
  doc.save(filename);
}

export function downloadCsv(rows: ExportRow[], filename: string) {
  downloadBlob(new Blob([csvContent(rows)], { type: "text/csv;charset=utf-8" }), filename);
}

export async function copyHtml(rows: ExportRow[]) {
  const html = `<table><thead><tr><th>Subject</th><th>Teacher</th><th>Tel. No.</th><th>Email Address</th></tr></thead><tbody>${rows
    .map((row) => `<tr><td>${escapeHtml(row.Subject)}</td><td>${escapeHtml(row.Teacher)}</td><td>${escapeHtml(row["Tel. No."])}</td><td>${escapeHtml(row["Email Address"])}</td></tr>`)
    .join("")}</tbody></table>`;
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([csvContent(rows)], { type: "text/plain" }),
    }),
  ]);
}

function rowFrom(record: TimetableRecord, match?: MatchRecord, staff?: StaffRecord): ExportRow {
  return {
    Subject: record.subject_display || record.subject_raw,
    Teacher: match?.manual_name || staff?.full_name || "",
    "Tel. No.": match?.manual_tel || staff?.full_telephone || "",
    "Email Address": match?.manual_email || staff?.email || "",
  };
}

function sanitiseRow(row: ExportRow): ExportRow {
  return {
    Subject: safeExportCell(row.Subject),
    Teacher: safeExportCell(row.Teacher),
    "Tel. No.": safeExportCell(row["Tel. No."]),
    "Email Address": safeExportCell(row["Email Address"]),
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] ?? char));
}
