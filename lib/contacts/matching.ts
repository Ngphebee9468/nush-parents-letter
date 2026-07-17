import { emailUsername, initialsFromEmailUsername, nameDerivedInitials, normaliseInitials } from "./normalise";
import type { MatchRecord, StaffRecord, TimetableRecord } from "./types";

const teacherAliasUsernames: Record<string, string[]> = {
  IK: ["nhski"],
  CVL: ["nhscvl"],
  TCYE: ["anhstcye"],
  TCY: ["nhstcy"],
  DY: ["nhsdy"],
  SH: ["anhsshy"],
  BG: ["anhsbgqx"],
  CSY: ["nhscs"],
  AY: ["yak"],
  HHX: ["nhshxh"],
  APC: ["powchew"],
  LFH: ["anhslfh"],
  VWYL: ["nhswyl"],
  KSB: ["nhsksb"],
  HT: ["nhstsk"],
  VJZ: ["nhsjz"],
  NCL: ["nhsncl"],
  MG: ["nhsemg"],
  CCH: ["nhscch"],
  RBI: ["nhsri"],
  ZCL: ["anhszdh2"],
  ZTL: ["vasuki14"],
  FKM: ["nhsfkm"],
  AKS: ["anhsaksy"],
  AKSY: ["anhsaksy"],
  DTY: ["nhsdty", "nhsndty"],
  DTYY: ["nhsdty", "nhsndty"],
  DCKI: ["dav_chee"],
  DCKL: ["dav_chee"],
  KLKF: ["nhslkf", "nhsllka"],
};

const teacherAliasFallback: Record<string, Array<{ name: string; tel: string; email: string }>> = {
  IK: [{ name: "Ms Koo Ivy", tel: "6516 7298", email: "nhski@nus.edu.sg" }],
  MS: [{ name: "Unverified code MS", tel: "", email: "" }],
  JT: [{ name: "Joyce Tan", tel: "", email: "" }],
  CVL: [{ name: "Mr Chia Vui Leong", tel: "6516 1728", email: "nhscvl@nus.edu.sg" }],
  TCYE: [{ name: "Mr Choo Yi En Theodore", tel: "6516 5368", email: "anhstcye@nus.edu.sg" }],
  TCY: [{ name: "Mr Toh Chen Yeong", tel: "6516 1733", email: "nhstcy@nus.edu.sg" }],
  DY: [{ name: "Ms Dong Yanqin", tel: "6516 4448", email: "nhsdy@nus.edu.sg" }],
  SH: [{ name: "Ms Song Haiyan", tel: "6601 1807", email: "anhsshy@nus.edu.sg" }],
  BG: [{ name: "Mr Goh Qi Xuan Benjamin", tel: "6516 2361", email: "anhsbgqx@nus.edu.sg" }],
  CSY: [{ name: "Dr Chiam Sher-Yi", tel: "6516 5159", email: "nhscs@nus.edu.sg" }],
  AY: [{ name: "Dr Yoanna Arlina Kurnianingsih", tel: "6516 1508", email: "yak@nus.edu.sg" }],
  HHX: [{ name: "Mrs Teo-Huang Huan Xin", tel: "6601 2331", email: "nhshxh@nus.edu.sg" }],
  APC: [{ name: "Mr Ang Pow Chew", tel: "6516 3484", email: "powchew@nus.edu.sg" }],
  LFH: [{ name: "Mr Low Fook Hong", tel: "6516 1806", email: "anhslfh@nus.edu.sg" }],
  VWYL: [{ name: "Ms Woo Yok Lin Verlyn", tel: "6516 1772", email: "nhswyl@nus.edu.sg" }],
  KSB: [{ name: "Ms Koh Siok Bee", tel: "6516 8629", email: "nhsksb@nus.edu.sg" }],
  HT: [{ name: "Mr Tan Soon Kee @ Hariz Tan", tel: "6516 7718", email: "nhstsk@nus.edu.sg" }],
  VJZ: [{ name: "Ms Jiang Zewei Vivian", tel: "6601 3239", email: "nhsjz@nus.edu.sg" }],
  ZMATHV: [{ name: "Math Vendor", tel: "", email: "" }],
  NCL: [{ name: "Mr Ng Chee Loong", tel: "6516 1726", email: "nhsncl@nus.edu.sg" }],
  PL: [{ name: "Phylliscia Lee", tel: "", email: "" }],
  YXH: [{ name: "Unverified code YXH", tel: "", email: "" }],
  MG: [{ name: "Mrs Elizabeth Mariko Nishida Gomez", tel: "6516 4449", email: "nhsemg@nus.edu.sg" }],
  CCH: [{ name: "Mr Chua Chin Haw", tel: "6516 1737", email: "nhscch@nus.edu.sg" }],
  RBI: [{ name: "Mdm Rohaida Bte Ismail", tel: "6516 8634", email: "nhsri@nus.edu.sg" }],
  BWW: [{ name: "Ms Bay Wee Wen", tel: "6516 1774", email: "nhsbww@nus.edu.sg" }],
  MT: [{ name: "Ms Tay Melody", tel: "6601 1804", email: "anhstm@nus.edu.sg" }],
  EFTV: [{ name: "Dr Eric Francis Tinsay Valles", tel: "6516 8631", email: "nhseftv@nus.edu.sg" }],
  CYM: [{ name: "Mr Chan Yu Ming", tel: "6516 8637", email: "nhschany@nus.edu.sg" }],
  LCL: [{ name: "Dr Lee Chan Lye", tel: "6516 7302", email: "nhslcl@nus.edu.sg" }],
  MK: [{ name: "Mr Murali Krishnaswamy", tel: "6516 8538", email: "nhsmk@nus.edu.sg" }],
  YT: [{ name: "Unverified code YT", tel: "", email: "" }],
  FSSF: [{ name: "Dr Soh Shu Fang Flora", tel: "6601 2259", email: "nhsssff@nus.edu.sg" }],
  ZCL: [{ name: "Mr Zheng Dehua", tel: "6516 1899", email: "anhszdh2@nus.edu.sg" }],
  ZTL: [{ name: "Mdm Subramanian Vasuki", tel: "6516 3650", email: "vasuki14@nus.edu.sg" }],
  FKM: [{ name: "Mr Fan Kai Ming", tel: "6516 1730", email: "nhsfkm@nus.edu.sg" }],
  AKS: [{ name: "Mdm Kong Seow Yoke Annie", tel: "6601 8089", email: "anhsaksy@nus.edu.sg" }],
  AKSY: [{ name: "Mdm Kong Seow Yoke Annie", tel: "6601 8089", email: "anhsaksy@nus.edu.sg" }],
  DTY: [{ name: "Mr Norman Dominique Tse Y-Yin", tel: "6601 2638", email: "nhsndty@nus.edu.sg" }],
  DTYY: [{ name: "Mr Norman Dominique Tse Y-Yin", tel: "6601 2638", email: "nhsndty@nus.edu.sg" }],
  DCKI: [{ name: "Mr Chee Kok Liang David", tel: "6516 1991", email: "dav_chee@nus.edu.sg" }],
  DCKL: [{ name: "Mr Chee Kok Liang David", tel: "6516 1991", email: "dav_chee@nus.edu.sg" }],
  KLKF: [
    { name: "Mr Loke Kok Fei Keefe", tel: "6601 1914", email: "nhslkf@nus.edu.sg" },
    { name: "Ms Loh Lai Kiang Angela", tel: "6516 2408", email: "nhsllka@nus.edu.sg" },
  ],
};

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
    const exact = staff.filter((person) => staffInitials(person).includes(initials));
    const singleLetter = initials.length === 1;

    const alias = aliasStaff(initials, staff);
    if (alias.length === 1) {
      return base(record, sessionId, index, {
        staff_record_id: alias[0].id,
        match_method: "configured_alias",
        confidence: 1,
        status: "confirmed_exact",
      });
    }
    if (alias.length > 1) {
      return base(record, sessionId, index, {
        staff_record_id: alias[0].id,
        match_method: "configured_alias",
        confidence: 1,
        status: "confirmed_exact",
        manual_name: alias.map((person) => person.full_name).join(" / "),
        manual_tel: uniqueJoin(alias.map((person) => person.full_telephone)),
        manual_email: uniqueJoin(alias.map((person) => person.email)),
        possible_matches: alias.map((person) => ({
          staff_record_id: person.id,
          score: 1,
          reason: "Configured PE alias",
        })),
      });
    }

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

    const emailMatch = staff.find((person) => initialsFromEmailUsername(person.email) === initials || emailUsername(person.email).endsWith(initials.toLowerCase()));
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

    const fallback = teacherAliasFallback[initials] ?? [];
    if (fallback.length > 0) {
      const complete = fallback.every((person) => person.tel && person.email && !person.name.startsWith("Unverified code"));
      return base(record, sessionId, index, {
        staff_record_id: null,
        match_method: "configured_alias",
        confidence: complete ? 0.99 : 0.6,
        status: complete ? "confirmed_exact" : "probable",
        manual_name: fallback.map((person) => person.name).join(" / "),
        manual_tel: uniqueJoin(fallback.map((person) => person.tel)),
        manual_email: uniqueJoin(fallback.map((person) => person.email)),
      });
    }

    const fuzzy = staff
      .map((person) => ({
        staff_record_id: person.id,
        score: staffInitials(person).some((candidate) => levenshtein(initials, candidate) <= 1) ? 0.6 : 0,
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

function staffInitials(person: StaffRecord) {
  return Array.from(
    new Set(
      [person.initials_normalised, normaliseInitials(person.initials_raw), initialsFromEmailUsername(person.email)]
        .concat(nameDerivedInitials(person.full_name))
        .filter(Boolean),
    ),
  );
}

function aliasStaff(initials: string, staff: StaffRecord[]) {
  const usernames = teacherAliasUsernames[initials] ?? [];
  return staff.filter((person) => {
    const username = emailUsername(person.email || person.email_username).toLowerCase();
    return usernames.includes(username);
  });
}

function uniqueJoin(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).join(" / ");
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
    manual_name: values.manual_name,
    manual_tel: values.manual_tel,
    manual_email: values.manual_email,
    notes: values.notes ?? null,
  };
}
