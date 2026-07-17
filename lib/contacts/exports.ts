import { safeExportCell } from "./normalise";
import type { AppData, MatchRecord, StaffRecord, TimetableRecord } from "./types";

export type ExportRow = {
  Subject: string;
  Teacher: string;
  "Tel. No.": string;
  "Email Add.": string;
};

export function previewRows(data: AppData): ExportRow[] {
  const rows = data.timetable
    .filter((record) => record.included)
    .flatMap((record) => {
      const match = data.matches.find((item) => item.timetable_record_id === record.id);
      const staff = match?.staff_record_id ? data.staff.find((item) => item.id === match.staff_record_id) : undefined;
      return rowsFrom(record, match, staff);
    });
  return groupSubjectCells(rows);
}

export function csvContent(rows: ExportRow[]) {
  const headers = ["Subject", "Teacher", "Tel. No.", "Email Add."] as const;
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
  const headers = ["Subject", "Teacher", "Tel. No.", "Email Add."];
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
    doc.text(`${row.Subject} | ${row.Teacher} | ${row["Tel. No."]} | ${row["Email Add."]}`, 14, y);
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
  const html = `<table><thead><tr><th>Subject</th><th>Teacher</th><th>Tel. No.</th><th>Email Add.</th></tr></thead><tbody>${rows
    .map((row) => `<tr><td>${escapeHtml(row.Subject)}</td><td>${escapeHtml(row.Teacher)}</td><td>${escapeHtml(row["Tel. No."])}</td><td>${escapeHtml(row["Email Add."])}</td></tr>`)
    .join("")}</tbody></table>`;
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([csvContent(rows)], { type: "text/plain" }),
    }),
  ]);
}

function rowsFrom(record: TimetableRecord, match?: MatchRecord, staff?: StaffRecord): ExportRow[] {
  const names = splitJoined(match?.manual_name);
  const tels = splitJoined(match?.manual_tel);
  const emails = splitJoined(match?.manual_email);
  if (names.length > 1 || tels.length > 1 || emails.length > 1) {
    const count = Math.max(names.length, tels.length, emails.length);
    return Array.from({ length: count }, (_, index) => ({
      Subject: record.subject_display || record.subject_raw,
      Teacher: names[index] ?? names[0] ?? "",
      "Tel. No.": tels[index] ?? tels[0] ?? "",
      "Email Add.": emails[index] ?? emails[0] ?? "",
    }));
  }
  return [rowFrom(record, match, staff)];
}

function rowFrom(record: TimetableRecord, match?: MatchRecord, staff?: StaffRecord): ExportRow {
  return {
    Subject: record.subject_display || record.subject_raw,
    Teacher: match?.manual_name || staff?.full_name || unresolvedCodeLabel(record, match),
    "Tel. No.": match?.manual_tel || staff?.full_telephone || "",
    "Email Add.": match?.manual_email || staff?.email || "",
  };
}

function unresolvedCodeLabel(record: TimetableRecord, match?: MatchRecord) {
  if (!match || match.status === "confirmed_exact" || match.status === "manually_selected") return "";
  return `Unmatched code: ${record.teacher_initials_raw || record.teacher_initials_normalised}`;
}

function splitJoined(value: string | undefined) {
  return value?.split(/\s+\/\s+/).map((item) => item.trim()).filter(Boolean) ?? [];
}

function groupSubjectCells(rows: ExportRow[]) {
  let previous = "";
  return rows.map((row) => {
    const subject = row.Subject;
    const next = { ...row, Subject: subject === previous ? "" : subject };
    if (subject) previous = subject;
    return next;
  });
}

function sanitiseRow(row: ExportRow): ExportRow {
  return {
    Subject: safeExportCell(row.Subject),
    Teacher: safeExportCell(row.Teacher),
    "Tel. No.": safeExportCell(row["Tel. No."]),
    "Email Add.": safeExportCell(row["Email Add."]),
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
