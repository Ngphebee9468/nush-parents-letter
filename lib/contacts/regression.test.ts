import { describe, expect, it } from "vitest";
import { buildMatches } from "./matching";
import { normaliseTelephone } from "./normalise";
import { parseDirectoryMatrix, parseTimetableText } from "./parse";
import { runRegressionChecks } from "./tests";
import { previewRows } from "./exports";
import { demoData } from "./demo";

describe("contact generator regressions", () => {
  it("passes the bundled safety checks", () => {
    expect(() => runRegressionChecks()).not.toThrow();
  });

  it("formats school phone numbers deterministically", () => {
    expect(normaliseTelephone("68533")).toEqual({ full_telephone: "6516 8533", telephone_review_required: false });
    expect(normaliseTelephone("11807")).toEqual({ full_telephone: "6601 1807", telephone_review_required: false });
    expect(normaliseTelephone("65168533")).toEqual({ full_telephone: "6516 8533", telephone_review_required: false });
    expect(normaliseTelephone("66011807")).toEqual({ full_telephone: "6601 1807", telephone_review_required: false });
    expect(normaliseTelephone("6 8533")).toEqual({ full_telephone: "6516 8533", telephone_review_required: false });
    expect(normaliseTelephone("")).toEqual({ full_telephone: "", telephone_review_required: true });
    expect(normaliseTelephone("invalid text")).toEqual({ full_telephone: "invalid text", telephone_review_required: true });
  });

  it("reads staff-directory username cells as usable school emails", () => {
    const staff = parseDirectoryMatrix(
      [["S/N", "Name", "Ext", "Mobile", "Email"], ["1", "Mr Fan Kai Ming, Teacher", "61730", "", "nhsfkm"]],
      "session",
      "Staff",
      { tel6: "6516", tel1: "6601" },
    );
    expect(staff[0]).toMatchObject({
      full_name: "Mr Fan Kai Ming",
      email: "nhsfkm@nus.edu.sg",
      full_telephone: "6516 1730",
    });
  });

  it("extracts class 101 subject rows and configured PE teachers", () => {
    const rows = parseTimetableText(
      "Math 1\nJT\nMath 2\nCVL\nPhysics 1 DV 1\nBG\nCSY / AY / HHX / APC\nWH Physics 1 PE Recess Lunch Music 1\nFKM / AKSY\nDTYY / DCKL\nKLKF",
      "session",
      "101",
    );
    expect(rows.map((row) => `${row.subject_raw}:${row.teacher_initials_normalised}`)).toEqual(
      expect.arrayContaining(["Math 1:JT", "Math 2:CVL", "Physics 1:BG", "DV 1:CSY", "DV 1:APC", "PE:FKM", "PE:KLKF"]),
    );
  });

  it("renders PE multi-teacher contact rows like the requested table", () => {
    const demo = demoData();
    const timetable = [
      {
        ...demo.timetable[0],
        id: "pe-klkf",
        subject_raw: "PE",
        subject_display: "Physical Education",
        teacher_initials_raw: "KLKF",
        teacher_initials_normalised: "KLKF",
      },
    ];
    const data = { ...demo, timetable, matches: buildMatches(demo.session.id, timetable, []) };
    expect(previewRows(data)).toEqual([
      { Subject: "Physical Education", Teacher: "Mr Loke Kok Fei Keefe", "Tel. No.": "6601 1914", "Email Add.": "nhslkf@nus.edu.sg" },
      { Subject: "", Teacher: "Ms Loh Lai Kiang Angela", "Tel. No.": "6516 2408", "Email Add.": "nhsllka@nus.edu.sg" },
    ]);
  });

  it("fills known class 101 non-PE contacts instead of blank preview cells", () => {
    const demo = demoData();
    const timetable = [
      { ...demo.timetable[0], id: "math-jt", subject_raw: "Math 1", subject_display: "Math 1", teacher_initials_raw: "JT", teacher_initials_normalised: "JT" },
      { ...demo.timetable[0], id: "dv-apc", subject_raw: "DV 1", subject_display: "DV 1", teacher_initials_raw: "APC", teacher_initials_normalised: "APC" },
      { ...demo.timetable[0], id: "robot-z", subject_raw: "Robot 1", subject_display: "Robot 1", teacher_initials_raw: "Z_MATHV", teacher_initials_normalised: "ZMATHV" },
    ];
    const data = { ...demo, timetable, matches: buildMatches(demo.session.id, timetable, []) };
    expect(previewRows(data)).toEqual([
      { Subject: "Math 1", Teacher: "Mr Tan Jit Bin Joseph", "Tel. No.": "6516 8648", "Email Add.": "nhstj@nus.edu.sg" },
      { Subject: "DV 1", Teacher: "Mr Ang Pow Chew", "Tel. No.": "6516 3484", "Email Add.": "powchew@nus.edu.sg" },
      { Subject: "Robot 1", Teacher: "Unmatched code: Z_MATHV", "Tel. No.": "", "Email Add.": "" },
    ]);
  });
});
