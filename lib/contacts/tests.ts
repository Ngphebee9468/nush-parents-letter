import { buildMatches } from "./matching";
import { initialsFromEmailUsername, normaliseInitials, normaliseTelephone } from "./normalise";
import { demoData } from "./demo";
import { parseDirectoryMatrix } from "./parse";

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
}
