"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoData } from "@/lib/contacts/demo";
import { buildMatches } from "@/lib/contacts/matching";
import { normaliseInitials, subjectDisplay } from "@/lib/contacts/normalise";
import { extractTimetable, parseDirectory } from "@/lib/contacts/parse";
import { copyHtml, downloadCsv, exportDocx, exportPdf, exportXlsx, previewRows } from "@/lib/contacts/exports";
import { runRegressionChecks } from "@/lib/contacts/tests";
import { hasSupabaseBrowserEnv } from "@/lib/supabase/env";
import type { AppData, MatchRecord, Stage } from "@/lib/contacts/types";

const stages: Stage[] = ["upload", "extract", "match", "review", "export"];
const labels: Record<Stage, string> = {
  upload: "Upload",
  extract: "Extract",
  match: "Match",
  review: "Review",
  export: "Export",
};

export default function Home() {
  const [data, setData] = useState<AppData>(() => {
    const seeded = demoData();
    return { ...seeded, matches: buildMatches(seeded.session.id, seeded.timetable, seeded.staff) };
  });
  const [stage, setStage] = useState<Stage>("review");
  const [files, setFiles] = useState<{ timetable?: File; directory?: File; template?: File }>({});
  const [message, setMessage] = useState("Demo class 602 is loaded. Upload files or review the sample rows.");
  const [busy, setBusy] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);
  const [threshold, setThreshold] = useState(0.9);
  const rows = useMemo(() => previewRows(data), [data]);
  const unresolved = data.matches.filter((match) => data.timetable.find((row) => row.id === match.timetable_record_id)?.included && match.confidence < threshold && match.status !== "manually_selected");

  useEffect(() => {
    try {
      runRegressionChecks();
      setUseSupabase(hasSupabaseBrowserEnv());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Regression checks failed.");
    }
  }, []);

  async function processFiles() {
    if (!files.timetable || !files.directory) {
      setMessage("Upload a PDF timetable and XLSX/CSV directory before processing.");
      return;
    }
    setBusy(true);
    try {
      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        class_name: data.session.class_name || "602",
        academic_year: data.session.academic_year,
        semester: data.session.semester,
        email_domain: data.session.email_domain,
        email_prefix: data.session.email_prefix,
        tel_prefix_6: data.session.tel_prefix_6,
        tel_prefix_1: data.session.tel_prefix_1,
        timetable_file_name: files.timetable.name,
        directory_file_name: files.directory.name,
        letter_template_file_name: files.template?.name,
        status: "extracting",
      };
      setStage("extract");
      setMessage("Extracting timetable cells and reading the staff directory...");
      const [timetable, staff] = await Promise.all([
        extractTimetable(files.timetable, sessionId, session.class_name),
        parseDirectory(files.directory, sessionId, { tel6: session.tel_prefix_6, tel1: session.tel_prefix_1 }),
      ]);
      setStage("match");
      const matches = buildMatches(sessionId, timetable, staff);
      const next = { session: { ...session, status: "reviewing" }, timetable, staff, matches };
      setData(next);
      await persistAll(next, files);
      setStage("review");
      setMessage(`Processed ${timetable.length} timetable rows and ${staff.length} staff rows. Review highlighted rows before export.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Processing failed. Please check the files and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function persistAll(next: AppData, uploaded = files) {
    if (!useSupabase) return;
    const supabase = createClient();
    await supabase.from("sessions").upsert(next.session);
    await supabase.from("timetable_records").insert(next.timetable);
    await supabase.from("staff_records").insert(next.staff);
    await supabase.from("match_records").insert(next.matches.map(stripClientOnlyMatchFields));
    const uploads = [
      ["timetable", uploaded.timetable],
      ["directory", uploaded.directory],
      ["letter-template", uploaded.template],
    ] as const;
    for (const [kind, file] of uploads) {
      if (file) await supabase.storage.from("session-files").upload(`${next.session.id}/${kind}-${cleanFileName(file.name)}`, file, { upsert: true });
    }
  }

  async function updateMatch(match: MatchRecord) {
    setData((current) => ({ ...current, matches: current.matches.map((item) => (item.id === match.id ? match : item)) }));
    if (useSupabase) {
      await createClient().from("match_records").upsert(stripClientOnlyMatchFields(match));
    }
  }

  async function exportFile(format: "docx" | "xlsx" | "pdf" | "csv" | "clipboard") {
    if (unresolved.length && !window.confirm(`${unresolved.length} rows are still unreviewed. Download anyway?`)) return;
    setStage("export");
    const filename = `Class_${data.session.class_name}_Teacher_Contacts_S2_2026.${format === "clipboard" ? "html" : format}`;
    if (format === "docx") await exportDocx(rows, filename);
    if (format === "xlsx") await exportXlsx(rows, filename);
    if (format === "pdf") await exportPdf(rows, filename);
    if (format === "csv") downloadCsv(rows, filename);
    if (format === "clipboard") await copyHtml(rows);
    if (useSupabase) {
      await createClient().from("export_logs").insert({
        session_id: data.session.id,
        export_format: format,
        file_name: filename,
        row_count: rows.length,
        included_subjects: rows.map((row) => row.Subject),
      });
    }
    setMessage(`${format.toUpperCase()} export complete.`);
  }

  async function deleteSession() {
    if (!window.confirm("Delete this session and uploaded files?")) return;
    if (useSupabase) {
      const supabase = createClient();
      await Promise.all([
        supabase.from("export_logs").delete().eq("session_id", data.session.id),
        supabase.from("match_records").delete().eq("session_id", data.session.id),
        supabase.from("timetable_records").delete().eq("session_id", data.session.id),
        supabase.from("staff_records").delete().eq("session_id", data.session.id),
        supabase.from("sessions").delete().eq("id", data.session.id),
      ]);
    }
    const seeded = demoData();
    setData({ ...seeded, matches: buildMatches(seeded.session.id, seeded.timetable, seeded.staff) });
    setFiles({});
    setStage("upload");
    setMessage("Session deleted. Demo data is ready again.");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#172033]">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <h1 className="text-xl font-semibold">Class Teacher Contacts</h1>
          <p className="mt-2 text-sm text-slate-600">Class {data.session.class_name}, {data.session.semester}</p>
          <StageRail active={stage} />
          <div className="mt-6 rounded border border-slate-200 bg-white p-3 text-sm">
            <div className="font-medium">Database</div>
            <div className={useSupabase ? "text-emerald-700" : "text-amber-700"}>{useSupabase ? "Supabase env detected" : "Demo/local mode"}</div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Prepare parent-letter contact table</h2>
              <p className="text-sm text-slate-600">{message}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => {
                const seeded = demoData();
                setData({ ...seeded, matches: buildMatches(seeded.session.id, seeded.timetable, seeded.staff) });
                setStage("review");
                setMessage("Demo class 602 loaded with LCS confirmed and D ambiguous for review.");
              }}>Demo 602</button>
              <button className="btn danger" onClick={deleteSession}>Delete/reset</button>
            </div>
          </header>

          <UploadPanel files={files} setFiles={setFiles} processFiles={processFiles} busy={busy} setMessage={setMessage} />
          <Settings data={data} setData={setData} threshold={threshold} setThreshold={setThreshold} />
          <Summary data={data} threshold={threshold} />
          <ReviewTable data={data} updateMatch={updateMatch} threshold={threshold} setData={setData} />
          <Preview rows={rows} exportFile={exportFile} unresolved={unresolved.length} />
        </section>
      </div>
    </main>
  );
}

function StageRail({ active }: { active: Stage }) {
  const activeIndex = stages.indexOf(active);
  return (
    <ol className="mt-6 space-y-2">
      {stages.map((stage, index) => (
        <li key={stage} className={`rounded px-3 py-2 text-sm ${index <= activeIndex ? "bg-[#1f6feb] text-white" : "bg-white text-slate-600"}`}>
          {labels[stage]}
        </li>
      ))}
    </ol>
  );
}

function UploadPanel({ files, setFiles, processFiles, busy, setMessage }: {
  files: { timetable?: File; directory?: File; template?: File };
  setFiles: (files: { timetable?: File; directory?: File; template?: File }) => void;
  processFiles: () => void;
  busy: boolean;
  setMessage: (message: string) => void;
}) {
  const assign = (key: "timetable" | "directory" | "template", extensions: string[], maxMb: number) => (file: File) => {
    try {
      setFiles({ ...files, [key]: validate(file, extensions, maxMb) });
      setMessage(`${file.name} ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File could not be accepted.");
    }
  };
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <FileBox title="Timetable PDF" accept="application/pdf" file={files.timetable} onFile={assign("timetable", ["pdf"], 20)} />
      <FileBox title="Staff directory" accept=".xlsx,.xls" file={files.directory} onFile={assign("directory", ["xlsx", "xls"], 10)} />
      <FileBox title="Letter template" accept=".docx" file={files.template} onFile={assign("template", ["docx"], 5)} />
      <div className="md:col-span-3">
        <button className="primary" disabled={busy || !files.timetable || !files.directory} onClick={processFiles}>{busy ? "Processing..." : "Process files"}</button>
      </div>
    </section>
  );
}

function FileBox({ title, accept, file, onFile }: { title: string; accept: string; file?: File; onFile: (file: File) => void }) {
  return (
    <label className="block rounded border border-dashed border-slate-300 bg-white p-4">
      <span className="text-sm font-medium">{title}</span>
      <span className="mt-2 block min-h-6 truncate text-sm text-slate-600">{file?.name ?? "Choose file"}</span>
      <input className="sr-only" type="file" accept={accept} onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
    </label>
  );
}

function Settings({ data, setData, threshold, setThreshold }: {
  data: AppData;
  setData: (data: AppData) => void;
  threshold: number;
  setThreshold: (value: number) => void;
}) {
  return (
    <details className="rounded border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-medium">Settings</summary>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {(["class_name", "academic_year", "semester", "email_domain"] as const).map((key) => (
          <label key={key} className="text-sm">
            <span className="block text-slate-600">{key.replace(/_/g, " ")}</span>
            <input className="input" value={data.session[key]} onChange={(event) => setData({ ...data, session: { ...data.session, [key]: event.target.value } })} />
          </label>
        ))}
        <label className="text-sm">
          <span className="block text-slate-600">confidence threshold</span>
          <input className="input" type="number" min="0" max="1" step="0.05" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
        </label>
      </div>
    </details>
  );
}

function Summary({ data, threshold }: { data: AppData; threshold: number }) {
  const counts = data.matches.reduce<Record<string, number>>((acc, match) => {
    acc[match.status] = (acc[match.status] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <section className="grid gap-3 md:grid-cols-5">
      <Metric label="Timetable rows" value={data.timetable.length} />
      <Metric label="Staff rows" value={data.staff.length} />
      <Metric label="Confirmed" value={counts.confirmed_exact ?? 0} />
      <Metric label="Needs review" value={data.matches.filter((match) => match.confidence < threshold).length} />
      <Metric label="Exports rows" value={previewRows(data).length} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded border border-slate-200 bg-white p-4"><div className="text-2xl font-semibold">{value}</div><div className="text-sm text-slate-600">{label}</div></div>;
}

function ReviewTable({ data, updateMatch, threshold, setData }: {
  data: AppData;
  updateMatch: (match: MatchRecord) => void;
  threshold: number;
  setData: (data: AppData) => void;
}) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 font-medium">Review matches</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>{["Include", "Subject", "Initials", "Matched name", "Tel", "Email", "Status", "Confidence", "Action"].map((header) => <th key={header} className="border-b border-slate-200 px-3 py-2 text-left">{header}</th>)}</tr>
          </thead>
          <tbody>
            {data.timetable.map((record) => {
              const match = data.matches.find((item) => item.timetable_record_id === record.id)!;
              const staff = match.staff_record_id ? data.staff.find((item) => item.id === match.staff_record_id) : undefined;
              const needsReview = match.confidence < threshold && match.status !== "manually_selected";
              return (
                <tr key={record.id} className={needsReview ? "bg-amber-50" : match.status === "no_match" ? "bg-red-50" : "bg-white"}>
                  <td className="border-b border-slate-100 px-3 py-2"><input type="checkbox" checked={record.included} onChange={(event) => setData({ ...data, timetable: data.timetable.map((item) => item.id === record.id ? { ...item, included: event.target.checked } : item) })} /></td>
                  <td className="border-b border-slate-100 px-3 py-2"><input className="input min-w-44" value={record.subject_display} onChange={(event) => setData({ ...data, timetable: data.timetable.map((item) => item.id === record.id ? { ...item, subject_display: subjectDisplay(event.target.value) } : item) })} /></td>
                  <td className="border-b border-slate-100 px-3 py-2"><input className="input w-20" value={record.teacher_initials_normalised} onChange={(event) => setData({ ...data, timetable: data.timetable.map((item) => item.id === record.id ? { ...item, teacher_initials_normalised: normaliseInitials(event.target.value) } : item), matches: buildMatches(data.session.id, data.timetable.map((item) => item.id === record.id ? { ...item, teacher_initials_normalised: normaliseInitials(event.target.value) } : item), data.staff) })} /></td>
                  <td className="border-b border-slate-100 px-3 py-2">{match.manual_name || staff?.full_name || "Unmatched"}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{match.manual_tel || staff?.full_telephone || ""}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{match.manual_email || staff?.email || ""}</td>
                  <td className="border-b border-slate-100 px-3 py-2"><span className={`badge ${needsReview ? "warn" : "ok"}`}>{match.status}</span></td>
                  <td className="border-b border-slate-100 px-3 py-2">{Math.round(match.confidence * 100)}%</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <select className="input min-w-56" value={match.staff_record_id ?? ""} onChange={(event) => {
                      const value = event.target.value;
                      const next = { ...match, staff_record_id: value || null, status: value ? "manually_selected" as const : "no_match" as const, confidence: value ? 1 : 0, confidence_review_status: "reviewed" as const, manually_confirmed: Boolean(value), match_method: value ? "manual" : "none" };
                      updateMatch(next);
                    }}>
                      <option value="">Manual/unmatched</option>
                      {data.staff.map((person) => <option key={person.id} value={person.id}>{person.initials_normalised} - {person.full_name}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Preview({ rows, exportFile, unresolved }: { rows: ReturnType<typeof previewRows>; exportFile: (format: "docx" | "xlsx" | "pdf" | "csv" | "clipboard") => void; unresolved: number }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Preview</h3>
          <p className="text-sm text-slate-600">{unresolved ? `${unresolved} rows still need review` : "All included rows are ready"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["docx", "xlsx", "pdf", "csv", "clipboard"] as const).map((format) => <button className="btn" key={format} onClick={() => exportFile(format)}>{format.toUpperCase()}</button>)}
        </div>
      </div>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead><tr className="bg-slate-200">{["Subject", "Teacher", "Tel. No.", "Email Add."].map((header) => <th className="border border-slate-400 px-3 py-2 text-center font-bold" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.Subject}-${index}`}>{Object.values(row).map((value, cell) => <td className="border border-slate-300 px-3 py-2" key={cell}>{value}</td>)}</tr>)}</tbody>
      </table>
    </section>
  );
}

function validate(file: File, extensions: string[], maxMb: number) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(extension)) throw new Error(`Unsupported file type. Please upload a ${extensions.join("/").toUpperCase()} file.`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File too large. Maximum size is ${maxMb} MB.`);
  if (extension === "pdf" && file.type && file.type !== "application/pdf") throw new Error("The timetable must be a real PDF file.");
  if (["xlsx", "xls"].includes(extension) && file.type && !/spreadsheet|excel|octet-stream/i.test(file.type)) {
    throw new Error("The staff directory must be an Excel workbook.");
  }
  return file;
}

function cleanFileName(value: string) {
  return value.replace(/[^a-z0-9._-]/gi, "_");
}

function stripClientOnlyMatchFields(match: MatchRecord) {
  return Object.fromEntries(
    Object.entries(match).filter(([key]) => !["manual_name", "manual_tel", "manual_email"].includes(key)),
  );
}
