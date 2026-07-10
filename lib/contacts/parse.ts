import { cleanEmail, emailUsername, initialsFromEmailUsername, normaliseInitials, normaliseTelephone, subjectDisplay } from "./normalise";
import type { StaffRecord, TimetableRecord } from "./types";

const venuePattern = /^(?:[A-Z]\d-\d+|LT\d+|THEATRETTE|LAB|ROOM|HALL)$/i;
const timePattern = /^\d{1,2}[:.]\d{2}$/;
const subjectNoise = /^(?:MON|TUE|WED|THU|FRI|SAT|SUN|BREAK|RECESS|LUNCH|ASSEMBLY)$/i;

export async function extractTimetable(file: File, sessionId: string, className: string) {
  const text = await readPdfText(file);
  if (!text.trim()) {
    throw new Error("No text detected. Switching to OCR...");
  }
  const rows = parseTimetableText(text, sessionId, className);
  if (!rows.length) {
    throw new Error("No teacher initials found. Please review the timetable.");
  }
  return rows;
}

export function parseTimetableText(text: string, sessionId: string, className: string): TimetableRecord[] {
  const lines = text
    .split(/\r?\n|(?<=\w)\s{2,}(?=\w)/)
    .map((line) => line.trim())
    .filter(Boolean);
  const records: TimetableRecord[] = [];

  for (const line of lines) {
    const parts = line.split(/\s*[/|]\s*/).filter(Boolean);
    const tokens = parts.length > 1 ? parts : line.split(/\s{2,}/).filter(Boolean);
    const initials = tokens.find((token) => {
      const normalised = normaliseInitials(token);
      return normalised.length >= 1 && normalised.length <= 4 && normalised === token.replace(/[^A-Za-z]/g, "").toUpperCase();
    });
    if (!initials) continue;

    const subject = tokens.find((token) => {
      const cleaned = token.trim();
      return cleaned !== initials && !venuePattern.test(cleaned) && !timePattern.test(cleaned) && !subjectNoise.test(cleaned);
    });
    if (!subject) continue;

    const venue = tokens.find((token) => venuePattern.test(token.trim())) ?? "";
    records.push({
      id: crypto.randomUUID?.() ?? `tt-${records.length}`,
      session_id: sessionId,
      class_name: className,
      subject_raw: subject,
      subject_display: subjectDisplay(subject),
      teacher_initials_raw: initials,
      teacher_initials_normalised: normaliseInitials(initials),
      venue,
      source_text: line,
      extraction_confidence: 0.9,
      extraction_confidence_source: "pdf_text_extract",
      included: true,
    });
  }

  return dedupe(records);
}

async function readPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  try {
    const pdfjs = await import("pdfjs-dist");
    const document = await pdfjs.getDocument({ data: buffer, useWorkerFetch: false, isEvalSupported: false }).promise;
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => ("str" in item ? item.str : "")).join("\n"));
    }
    return pageTexts.join("\n");
  } catch {
    const fallback = new TextDecoder("latin1").decode(buffer);
    return fallback.replace(/[^\x20-\x7E\n/|:.-]/g, " ");
  }
}

export async function parseDirectory(file: File, sessionId: string, prefixes = { tel6: "6516", tel1: "6601" }) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const rows = csvMatrix(await file.text());
    const staff = parseDirectoryMatrix(rows, sessionId, "CSV", prefixes);
    if (!staff.length) throw new Error("Could not identify required columns. Please check the directory format.");
    return staff;
  }
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const staff: StaffRecord[] = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], { header: 1, defval: "", blankrows: false });
    staff.push(...parseDirectoryMatrix(rows, sessionId, sheetName, prefixes));
  }
  if (!staff.length) {
    throw new Error("Could not identify required columns. Please check the directory format.");
  }
  return staff;
}

function parseDirectoryRows(
  rows: Record<string, unknown>[],
  sessionId: string,
  worksheetName: string,
  prefixes: { tel6: string; tel1: string },
): StaffRecord[] {
  return rows
    .map((row, index) => {
      const get = (patterns: RegExp[]) => {
        const key = Object.keys(row).find((header) => patterns.some((pattern) => pattern.test(header)));
        return key ? String(row[key] ?? "").trim() : "";
      };
      const fullName = get([/name/i, /staff/i, /teacher/i]);
      const initialsRaw = get([/initial/i, /code/i]);
      const email = cleanEmail(get([/email/i, /e-mail/i, /mail/i, /account/i, /user/i, /login/i]));
      const extension = get([/ext/i, /tel/i, /phone/i, /contact/i]);
      const initials = normaliseInitials(initialsRaw) || initialsFromEmailUsername(email);
      const phone = normaliseTelephone(extension, prefixes.tel6, prefixes.tel1);

      if (!fullName && !initials && !email) return null;
      return {
        id: crypto.randomUUID?.() ?? `staff-${index}`,
        session_id: sessionId,
        full_name: fullName || initials,
        initials_raw: initialsRaw || initials,
        initials_normalised: initials,
        department: get([/dept/i, /department/i, /subject/i]),
        extension_raw: extension,
        full_telephone: phone.full_telephone,
        telephone_review_required: phone.telephone_review_required,
        email,
        email_username: emailUsername(email),
        worksheet_name: worksheetName,
        source_row: index + 2,
      };
    })
    .filter((row): row is StaffRecord => Boolean(row));
}

export function parseDirectoryMatrix(
  matrix: unknown[][],
  sessionId: string,
  worksheetName: string,
  prefixes: { tel6: string; tel1: string },
) {
  const rows = matrix
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
  const headerIndex = rows.findIndex((row) => row.some((cell) => /email|e-mail|mail|account|user|login/i.test(cell)));
  if (headerIndex >= 0) {
    const headers = rows[headerIndex];
    const keyedRows = rows.slice(headerIndex + 1).map((row) =>
      Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, row[index] ?? ""])),
    );
    const parsed = parseDirectoryRows(keyedRows, sessionId, worksheetName, prefixes);
    if (parsed.length) return parsed;
  }

  return rows
    .map((row, index) => parseDirectoryLooseRow(row, index, sessionId, worksheetName, prefixes))
    .filter((row): row is StaffRecord => Boolean(row));
}

function parseDirectoryLooseRow(
  row: string[],
  index: number,
  sessionId: string,
  worksheetName: string,
  prefixes: { tel6: string; tel1: string },
): StaffRecord | null {
  const emailCell = row.find((cell) => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(cell)) ?? "";
  const usernameCell = row.find((cell) => /^(?:nhs|nush)[a-z]{1,6}$/i.test(cell)) ?? "";
  const initialsCell = row.find((cell) => /^[A-Z]{2,4}$/.test(cell)) ?? "";
  const extensionCell = row.find((cell) => {
    const digits = cell.replace(/\D/g, "");
    return digits.length >= 4 && digits.length <= 8 && !/20\d{2}/.test(digits);
  }) ?? "";
  const nameCell = row.find((cell) =>
    /^(?:mr|ms|mrs|mdm|dr)\b/i.test(cell) || (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(cell) && !cell.includes("@")),
  ) ?? "";
  const email = cleanEmail(emailCell || (usernameCell ? `${usernameCell}@nus.edu.sg` : ""));
  const initials = normaliseInitials(initialsCell) || initialsFromEmailUsername(email || usernameCell);
  const phone = normaliseTelephone(extensionCell, prefixes.tel6, prefixes.tel1);

  if (!email && !initials && !nameCell) return null;
  return {
    id: crypto.randomUUID?.() ?? `staff-loose-${index}`,
    session_id: sessionId,
    full_name: nameCell || initials,
    initials_raw: initialsCell || initials,
    initials_normalised: initials,
    department: "",
    extension_raw: extensionCell,
    full_telephone: phone.full_telephone,
    telephone_review_required: phone.telephone_review_required,
    email,
    email_username: emailUsername(email),
    worksheet_name: worksheetName,
    source_row: index + 1,
  };
}

function csvMatrix(text: string) {
  return text.split(/\r?\n/).filter(Boolean).map(splitCsvLine);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function dedupe(records: TimetableRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.subject_raw}-${record.teacher_initials_normalised}-${record.venue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
