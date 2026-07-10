import { buildMatches } from "./matching";
import { normaliseInitials, normaliseTelephone } from "./normalise";
import { demoData } from "./demo";

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
}
