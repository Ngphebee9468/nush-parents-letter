import { emailUsername, nameDerivedInitials, normaliseInitials } from "./normalise";
import type { MatchRecord, StaffRecord, TimetableRecord } from "./types";

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export function buildMatches(sessionId: string, timetable: TimetableRecord[], staff: StaffRecord[]) {
  return timetable.map((record, index): MatchRecord => {
    const initials = normaliseInitials(record.teacher_initials_normalised || record.teacher_initials_raw);
    const exact = staff.filter((person) => person.initials_normalised === initials);
    const singleLetter = initials.length === 1;

    if (exact.length === 1 && (!singleLetter || staff.filter((person) => person.initials_normalised === initials).length === 1)) {
      return base(record, sessionId, index, {
        staff_record_id: exact[0].id,
        match_method: "exact_initials",
        confidence: singleLetter ? 0.5 : 1,
        status: singleLetter ? "probable" : "confirmed_exact",
      });
    }

    if (exact.length > 1 || (singleLetter && exact.length > 0)) {
      return base(record, sessionId, index, {
        staff_record_id: null,
        match_method: "exact_initials",
        confidence: 0.5,
        status: "multiple_possible",
        possible_matches: exact.map((person) => ({
          staff_record_id: person.id,
          score: 0.5,
          reason: "Single-letter or duplicate initials require review",
        })),
      });
    }

    const emailMatch = staff.find((person) => emailUsername(person.email).endsWith(initials.toLowerCase()));
    if (emailMatch) {
      return base(record, sessionId, index, {
        staff_record_id: emailMatch.id,
        match_method: "email_username",
        confidence: 0.95,
        status: "probable",
      });
    }

    const nameMatch = staff.find((person) => nameDerivedInitials(person.full_name) === initials);
    if (nameMatch) {
      return base(record, sessionId, index, {
        staff_record_id: nameMatch.id,
        match_method: "name_derived",
        confidence: 0.85,
        status: "probable",
      });
    }

    const fuzzy = staff
      .map((person) => ({
        staff_record_id: person.id,
        score: levenshtein(initials, person.initials_normalised) <= 1 ? 0.6 : 0,
        reason: "Fuzzy initials suggestion",
      }))
      .filter((candidate) => candidate.score > 0)
      .slice(0, 5);

    return base(record, sessionId, index, {
      staff_record_id: null,
      match_method: fuzzy.length ? "fuzzy_suggest" : "none",
      confidence: fuzzy.length ? 0.6 : 0,
      status: fuzzy.length ? "multiple_possible" : "no_match",
      possible_matches: fuzzy,
    });
  });
}

function base(
  record: TimetableRecord,
  sessionId: string,
  index: number,
  values: Partial<MatchRecord>,
): MatchRecord {
  return {
    id: crypto.randomUUID?.() ?? `match-${index}`,
    session_id: sessionId,
    timetable_record_id: record.id,
    staff_record_id: values.staff_record_id ?? null,
    match_method: values.match_method ?? "none",
    confidence: values.confidence ?? 0,
    confidence_source: "matching_engine",
    confidence_review_status: values.status === "confirmed_exact" ? "reviewed" : "unreviewed",
    status: values.status ?? "no_match",
    possible_matches: values.possible_matches ?? [],
    manually_confirmed: false,
    notes: values.notes ?? null,
  };
}
