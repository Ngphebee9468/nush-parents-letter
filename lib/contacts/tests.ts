import { buildMatches } from "./matching";
import { initialsFromEmailUsername, normaliseInitials, normaliseTelephone } from "./normalise";
import { demoData } from "./demo";
import { parseDirectoryMatrix, parseTimetableText } from "./parse";

export function runRegressionChecks() {
  const phoneCases: [string, string, boolean][] = [
    ["68533", "6516 8533", false],
    ["68639", "6516 8639", false],
    ["11804", "6601 1804", false],
    ["11914", "6601 1914", false],
    ["65168533", "6516 8533", false],
    ["66011804", "6601 1804", false],
    ["", "", true],
    ["8533", "", true],
  ];
  for (const [input, expected, review] of phoneCases) {
    const result = normaliseTelephone(input);
    if (result.full_telephone !== expected || result.telephone_review_required !== review) {
      throw new Error(`Phone normalisation failed for ${input}`);
    }
  }

  if (normaliseInitials("L.C.S.") !== "LCS" || normaliseInitials(" noh ") !== "NOH") {
    throw new Error("Initials normalisation failed");
  }
  if (initialsFromEmailUsername("nhsbww@nus.edu.sg") !== "BWW" || initialsFromEmailUsername("nhslcs") !== "LCS") {
    throw new Error("Email username initials derivation failed");
  }

  const demo = demoData();
  const matches = buildMatches(demo.session.id, demo.timetable, demo.staff);
  const lcs = matches.find((match) => match.timetable_record_id === demo.timetable[0].id);
  const ambiguous = matches.find((match) => match.timetable_record_id === demo.timetable[5].id);
  if (lcs?.status !== "confirmed_exact" || lcs.match_method !== "exact_initials") {
    throw new Error("LCS matching regression failed");
  }
  if (ambiguous?.status !== "multiple_possible" || ambiguous.staff_record_id !== null) {
    throw new Error("Ambiguous D matching regression failed");
  }

  const emailOnly = buildMatches(
    demo.session.id,
    [{ ...demo.timetable[0], id: "email-derived-timetable", teacher_initials_raw: "BWW", teacher_initials_normalised: "BWW" }],
    [{ ...demo.staff[0], id: "email-derived-staff", initials_raw: "", initials_normalised: "", email: "nhsbww@nus.edu.sg", email_username: "nhsbww" }],
  )[0];
  if (emailOnly.status !== "confirmed_exact" || emailOnly.match_method !== "exact_initials") {
    throw new Error("nhsbww email-derived matching regression failed");
  }

  const looseDirectory = parseDirectoryMatrix(
    [
      ["Updated Staff Phone List", "", ""],
      ["BAY WEE WEN", "nhsbww", "68533"],
    ],
    demo.session.id,
    "Loose",
    { tel6: "6516", tel1: "6601" },
  );
  if (
    looseDirectory[0]?.initials_normalised !== "BWW" ||
    looseDirectory[0]?.full_name !== "Bay Wee Wen" ||
    looseDirectory[0]?.full_telephone !== "6516 8533"
  ) {
    throw new Error("Loose staff directory parsing regression failed");
  }

  const nameOnlyDirectory = parseDirectoryMatrix(
    [["Chan Yu Ming", "Mathematics", "11804"]],
    demo.session.id,
    "Name only",
    { tel6: "6516", tel1: "6601" },
  );
  const mathMatch = buildMatches(
    demo.session.id,
    [{ ...demo.timetable[0], id: "math-cym-timetable", subject_raw: "Math 6", subject_display: "Mathematics", teacher_initials_raw: "CYM", teacher_initials_normalised: "CYM" }],
    nameOnlyDirectory,
  )[0];
  if (nameOnlyDirectory[0]?.initials_normalised !== "CYM" || mathMatch.status !== "confirmed_exact") {
    throw new Error("Math CYM name-derived matching regression failed");
  }

  const peStaff = [
    { ...demo.staff[0], id: "fkm", full_name: "Foo Kok Meng", initials_raw: "", initials_normalised: "", email: "nhsfkm@nus.edu.sg", email_username: "nhsfkm" },
    { ...demo.staff[1], id: "aksy", full_name: "Ang Kai Sheng Yao", initials_raw: "", initials_normalised: "", email: "anhsaksy@nus.edu.sg", email_username: "anhsaksy" },
    { ...demo.staff[2], id: "dtyy", full_name: "Norman Dominique Tse Y-Yin", initials_raw: "", initials_normalised: "", email: "nhsndty@nus.edu.sg", email_username: "nhsndty" },
    { ...demo.staff[3], id: "dckl", full_name: "Dav Chee Kai Li", initials_raw: "", initials_normalised: "", email: "dav_chee@nus.edu.sg", email_username: "dav_chee" },
    { ...demo.staff[4], id: "lkf", full_name: "Lim Kai Feng", initials_raw: "", initials_normalised: "", email: "nhslkf@nus.edu.sg", email_username: "nhslkf" },
    { ...demo.staff[5], id: "llka", full_name: "Lee Li Kai", initials_raw: "", initials_normalised: "", email: "nhsllka@nus.edu.sg", email_username: "nhsllka" },
  ];
  for (const code of ["FKM", "AKSY", "DTYY", "DCKL"]) {
    const result = buildMatches(
      demo.session.id,
      [{ ...demo.timetable[0], id: `pe-${code}`, subject_raw: "PE", subject_display: "Physical Education", teacher_initials_raw: code, teacher_initials_normalised: code }],
      peStaff,
    )[0];
    if (result.status !== "confirmed_exact") {
      throw new Error(`PE alias matching regression failed for ${code}`);
    }
  }
  const klkf = buildMatches(
    demo.session.id,
    [{ ...demo.timetable[0], id: "pe-klkf", subject_raw: "PE", subject_display: "Physical Education", teacher_initials_raw: "KLKF", teacher_initials_normalised: "KLKF" }],
    peStaff,
  )[0];
  if (klkf.status !== "confirmed_exact" || !klkf.manual_email?.includes("nhslkf") || !klkf.manual_email?.includes("nhsllka")) {
    throw new Error("PE KLKF multi-teacher alias regression failed");
  }

  const parsedPe = parseTimetableText(
    "HCL 1 Math 1\nTCY / DY / SH\nJT\nMath 2\nCVL\nPhysics 1 DV 1\nBG\nCSY / AY / HHX / APC\nWH Physics 1 PE Recess Lunch CCE_Assembly Music 1\nFKM / AKSY\nFiDelTdY TYra /c Dk,CScKhLool\nKHLaKll,FIS /H D,N /e Dtball",
    demo.session.id,
    "101",
  );
  const peCodes = parsedPe.filter((row) => row.subject_display === "Physical Education").map((row) => row.teacher_initials_normalised);
  if (!["FKM", "AKSY", "DTYY", "DCKL", "KLKF"].every((code) => peCodes.includes(code))) {
    throw new Error("Configured PE timetable extraction regression failed");
  }
  const parsedPairs = parsedPe.map((row) => `${row.subject_raw}:${row.teacher_initials_normalised}`);
  for (const pair of ["Physics 1:BG", "DV 1:CSY", "DV 1:APC", "Math 1:JT", "Math 2:CVL"]) {
    if (!parsedPairs.includes(pair)) throw new Error(`Known timetable subject extraction failed for ${pair}`);
  }

  const fallbackKlkf = buildMatches(
    demo.session.id,
    [{ ...demo.timetable[0], id: "fallback-klkf", subject_raw: "PE", subject_display: "Physical Education", teacher_initials_raw: "KLKF", teacher_initials_normalised: "KLKF" }],
    [],
  )[0];
  if (fallbackKlkf.status !== "confirmed_exact" || !fallbackKlkf.manual_name?.includes("Loke Kok Fei") || !fallbackKlkf.manual_name?.includes("Loh Lai Kiang")) {
    throw new Error("PE fallback alias regression failed");
  }
}
