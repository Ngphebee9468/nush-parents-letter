import { describe, expect, it } from "vitest";
import { buildMatches } from "./matching";
import { normaliseTelephone, subjectDisplay } from "./normalise";
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
      "Math 1\nJT\nMath 2\nCVL\nPhysics 1 DV 1\nBG\nCSY / AY / HHX / APC\nBio Oly 2\nVLSF / KF\nWH Physics 1 PE Recess Lunch Music 1\nFKM / AKSY\nDTYY / DCKL\nKLKF",
      "session",
      "101",
    );
    expect(rows.map((row) => `${row.subject_raw}:${row.teacher_initials_normalised}`)).toEqual(
      expect.arrayContaining(["Math 1:JT", "Math 2:CVL", "Physics 1:BG", "DV 1:CSY", "DV 1:APC", "Bio Oly 2:VLSF", "Bio Oly 2:KF", "PE:FKM", "PE:KLKF"]),
    );
    expect(rows.map((row) => row.teacher_initials_normalised)).not.toContain("ZMATHV");
  });

  it("extracts class 203 Year 2 rows, including glued Bio Oly and enrichment text", () => {
    const rows = parseTimetableText(
      [
        "203",
        "HCL 2 Math 2 PE Recess Lunch Bio 2 Hum 2",
        "WJ / SH / HKK CVL VLSF IP",
        "CL 2 DTYY / DCKL / TSF",
        "TH/TL 2 Z_TL2",
        "Chem 2 EL 2 HHX PL",
        "Physics 2 Geog 2 DV JM 2 CSKS / LYH / BG RYIC / IP",
        "Hist 2 CB / PHPS",
        "Eng Lit 2 DWSP DV JSR 2 AY / YT",
        "Music 2 MS DV JMR 2 RCMH / JYHM / CYM",
        "CS 2 LD Math Oly 2 LCL Math Oly 2ZV_MathV",
        "Chem Oly 2 JJPM Phys Oly 2 PBH Chem Pot 2GTYM",
        "CS_Enr 1n2NCL / PL Bio Oly 2VLSF / KF",
      ].join("\n"),
      "session",
      "203",
    );
    expect(rows.map((row) => `${row.subject_raw}:${row.teacher_initials_normalised}`)).toEqual(
      expect.arrayContaining([
        "Math 2:CVL",
        "HCL 2:WJ",
        "CL 2:TSF",
        "Chem 2:HHX",
        "EL 2:PL",
        "Physics 2:LYH",
        "Geog 2:RYIC",
        "DV JM 2:CSKS",
        "DV JMR 2:CYM",
        "CS 2:LD",
        "Chem Pot 2:GTYM",
        "CS_Enr 1n2:PL",
        "Bio Oly 2:VLSF",
        "Bio Oly 2:KF",
      ]),
    );
    expect(rows.map((row) => row.teacher_initials_normalised)).not.toContain("ZMATHV");
  });

  it("ignores code-only PDF noise instead of creating fake SLRKH subjects", () => {
    const rows = parseTimetableText(
      [
        "DZVJ J/ SLRKH 2 / LLC / DYSY / GTYM / VLSF / THC /",
        "D4-05A,YD 4/ -Y0T6",
        "DZVJ J/ SLRKH 2 / LLC / DYSY / GTYM / VLSF / THC /",
        "D4-05A,YD 4/ -Y0T6",
      ].join("\n"),
      "session",
      "203",
    );
    expect(rows).toEqual([]);
  });

  it("extracts the full DV JSR 2 teacher group from the timetable block", () => {
    const demo = demoData();
    const timetable = parseTimetableText(
      "DV JSR 2\nZJ / LKH / LLC / DYSY / GTYM / VLSF / THC /\nAY / YT\nD4-05,D4-06,D4-07,D4-08,D4-16",
      demo.session.id,
      "203",
    ).filter((row) => row.subject_raw === "DV JSR 2");
    expect(timetable.map((row) => row.teacher_initials_normalised)).toEqual(
      expect.arrayContaining(["ZJ", "LKH", "LLC", "DYSY", "GTYM", "VLSF", "THC", "AY", "YT"]),
    );
    expect(timetable.map((row) => row.teacher_initials_normalised)).not.toContain("ZK");

    const data = { ...demo, timetable, staff: [], matches: buildMatches(demo.session.id, timetable, []) };
    expect(previewRows(data)).toEqual([
      { Subject: "Da Vinci Junior Science Research", Teacher: "Ms Zhong Jingyi", "Tel. No.": "6601 2721", "Email Add.": "nhszj@nus.edu.sg" },
      { Subject: "", Teacher: "Mr Lee Kim Hun", "Tel. No.": "6516 8213", "Email Add.": "nhslkh@nus.edu.sg" },
      { Subject: "", Teacher: "Ms Lim Li Chen", "Tel. No.": "6516 1736", "Email Add.": "nhsllc@nus.edu.sg" },
      { Subject: "", Teacher: "Mr Yeo Shyh Yuan Don", "Tel. No.": "6516 1721", "Email Add.": "nhsysy@nus.edu.sg" },
      { Subject: "", Teacher: "Mrs Khoo-Teo Yew Mei Grace", "Tel. No.": "6601 2096", "Email Add.": "nhstymg@nus.edu.sg" },
      { Subject: "", Teacher: "Ms Lim Suat Fong Valerie", "Tel. No.": "6516 7301", "Email Add.": "nhslsf@nus.edu.sg" },
      { Subject: "", Teacher: "Dr Tang Hock Chun", "Tel. No.": "6516 8639", "Email Add.": "nhsthc@nus.edu.sg" },
      { Subject: "", Teacher: "Dr Yoanna Arlina Kurnianingsih", "Tel. No.": "6516 1508", "Email Add.": "yak@nus.edu.sg" },
      { Subject: "", Teacher: "Ms Tang Yee Voon", "Tel. No.": "6516 3593", "Email Add.": "anhsyvtang@nus.edu.sg" },
    ]);
  });

  it("extracts class 301 Year 3 subjects instead of only PE rows", () => {
    const demo = demoData();
    const timetable = parseTimetableText(
      [
        "Math 3 HCL L 3 LZ / CCH / TSF Recess Physics 3 EL 3 Lunch JP 3 MG",
        "JTYH B4-03,B4-04,B5-02 CL3 Yr3LPS_MT",
        "CL 3 Z_CL TH/TL 3 Z_TL2 / Z_TL",
        "CS 3 PE Recess EL 3 Lunch Physics 3 JP 3 MG",
        "CCES Chem Oly 3LW Phys Oly 3 YW",
        "CS Oly 3 LD Com 2 Robotics 3 YW",
        "Music 3 PE Recess EL 3 Math 3 Lunch Bio 3 Chem 3",
        "MS JTYH LKL DYSY Eng Lit 3 EV EL Bridge 3APC",
        "Robotics 3 YW Phy Lab 3 Bio Oly 3 NOH / FKC / RSKH",
        "Math 4 LCL Math 5 LCH",
      ].join("\n"),
      demo.session.id,
      "301",
    );
    expect(timetable.map((row) => `${row.subject_raw}:${row.teacher_initials_normalised}`)).toEqual(
      expect.arrayContaining([
        "Math 3:JTYH",
        "HCL L 3:LZ",
        "CL3 Yr3:LPSMT",
        "CL 3:ZCL",
        "TH/TL 3:ZTL",
        "CS 3:CCES",
        "Chem Oly 3:LW",
        "Phys Oly 3:YW",
        "CS Oly 3:LD",
        "Robotics 3:YW",
        "Bio Oly 3:NOH",
        "Bio Oly 3:FKC",
        "Bio Oly 3:RSKH",
        "Music 3:MS",
        "Bio 3:LKL",
        "Chem 3:DYSY",
        "Eng Lit 3:EV",
        "EL Bridge 3:APC",
        "Math 4:LCL",
        "Math 5:LCH",
      ]),
    );

    const data = { ...demo, timetable, staff: [], matches: buildMatches(demo.session.id, timetable, []) };
    const rows = previewRows(data);
    expect(rows).toEqual(expect.arrayContaining([
      { Subject: "Year 3 Math", Teacher: "Mr Teoh Yeow Hwee Joel", "Tel. No.": "6601 3237", "Email Add.": "nhstyhj@nus.edu.sg" },
      { Subject: "Year 4 Math", Teacher: "Dr Lee Chan Lye", "Tel. No.": "6516 7302", "Email Add.": "nhslcl@nus.edu.sg" },
      { Subject: "Year 5 Math", Teacher: "Mr Low Chin Han", "Tel. No.": "6516 7300", "Email Add.": "nhslch@nus.edu.sg" },
      { Subject: "Bio Oly 3", Teacher: "Ms Ng Oon Hui Phebee", "Tel. No.": "6516 1722", "Email Add.": "nhsnoh@nus.edu.sg" },
      { Subject: "Year 3 Computer Science", Teacher: "Mr Chua Eng Siong Claude", "Tel. No.": "6516 5247", "Email Add.": "nhscesc@nus.edu.sg" },
      { Subject: "Year 3 Music", Teacher: "Dr Sim Li Kern, Mark", "Tel. No.": "6516 4002", "Email Add.": "drmarksim@nus.edu.sg" },
    ]));
  });

  it("displays user-facing subject names from year-based timetable codes", () => {
    expect(subjectDisplay("Bio Oly 2VLSF")).toBe("Bio Oly 2");
    expect(subjectDisplay("Math 2")).toBe("Year 2 Math");
    expect(subjectDisplay("Math 3")).toBe("Year 3 Math");
    expect(subjectDisplay("Math 4")).toBe("Year 4 Math");
    expect(subjectDisplay("Math 5")).toBe("Year 5 Math");
    expect(subjectDisplay("EL2")).toBe("Year 2 English");
    expect(subjectDisplay("Hum 1")).toBe("Year 1 Humanities");
    expect(subjectDisplay("Chem 3")).toBe("Year 3 Chemistry");
    expect(subjectDisplay("Physics 3")).toBe("Year 3 Physics");
    expect(subjectDisplay("CS 2")).toBe("Year 2 Computer Science");
    expect(subjectDisplay("Bio 6")).toBe("Biology");
    expect(subjectDisplay("BL 2")).toBe("Year 2 Biology");
    expect(subjectDisplay("DV JM 2")).toBe("Da Vinci Junior Science Maker");
    expect(subjectDisplay("DV JSR")).toBe("Da Vinci Junior Science Research");
    expect(subjectDisplay("CL3 Yr2")).toBe("Year 2 Chinese");
    expect(subjectDisplay("ML3 Yr3")).toBe("Year 3 Malay");
    expect(subjectDisplay("Geog 2")).toBe("Year 2 Geography");
    expect(subjectDisplay("Hist 2")).toBe("Year 2 History");
    expect(subjectDisplay("Eng Lit 2")).toBe("Year 2 English Literature");
    expect(subjectDisplay("Music 2")).toBe("Year 2 Music");
  });

  it("matches Year 2 Music MS to Dr Mark Sim from the staff directory username", () => {
    const demo = demoData();
    const staff = parseDirectoryMatrix(
      [["S/N", "Name", "Ext", "Mobile", "Email"], ["1", "Dr Sim Li Kern, Mark (Adjunct Teacher)", "64002", "", "drmarksim"]],
      "session",
      "Staff",
      { tel6: "6516", tel1: "6601" },
    );
    const timetable = [
      {
        ...demo.timetable[0],
        id: "music-ms",
        subject_raw: "Music 2",
        subject_display: "Year 2 Music",
        teacher_initials_raw: "MS",
        teacher_initials_normalised: "MS",
      },
    ];
    const data = { ...demo, timetable, staff, matches: buildMatches(demo.session.id, timetable, staff) };
    expect(previewRows(data)).toEqual([
      { Subject: "Year 2 Music", Teacher: "Dr Sim Li Kern, Mark (adjunct Teacher)", "Tel. No.": "6516 4002", "Email Add.": "drmarksim@nus.edu.sg" },
    ]);
  });

  it("fills Music MS from the configured fallback when the directory row is unavailable", () => {
    const demo = demoData();
    const timetable = [
      {
        ...demo.timetable[0],
        id: "music-ms-fallback",
        subject_raw: "Music 2",
        subject_display: "Year 2 Music",
        teacher_initials_raw: "MS",
        teacher_initials_normalised: "MS",
      },
    ];
    const data = { ...demo, timetable, staff: [], matches: buildMatches(demo.session.id, timetable, []) };
    expect(previewRows(data)).toEqual([
      { Subject: "Year 2 Music", Teacher: "Dr Sim Li Kern, Mark", "Tel. No.": "6516 4002", "Email Add.": "drmarksim@nus.edu.sg" },
    ]);
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
      { ...demo.timetable[0], id: "dv-ay", subject_raw: "DV 1", subject_display: "DV 1", teacher_initials_raw: "AY", teacher_initials_normalised: "AY" },
      { ...demo.timetable[0], id: "cl-z", subject_raw: "CL 1", subject_display: "CL 1", teacher_initials_raw: "Z_CL", teacher_initials_normalised: "ZCL" },
      { ...demo.timetable[0], id: "tl-z", subject_raw: "TH/TL 1", subject_display: "TH/TL 1", teacher_initials_raw: "Z_TL", teacher_initials_normalised: "ZTL" },
      { ...demo.timetable[0], id: "mg", subject_raw: "JP 1_Enrich", subject_display: "JP 1_Enrich", teacher_initials_raw: "MG", teacher_initials_normalised: "MG" },
      { ...demo.timetable[0], id: "pl", subject_raw: "CS_Enr 1n2", subject_display: "CS_Enr 1n2", teacher_initials_raw: "PL", teacher_initials_normalised: "PL" },
      { ...demo.timetable[0], id: "bio-oly-vlsf", subject_raw: "Bio Oly 2", subject_display: "Bio Oly 2", teacher_initials_raw: "VLSF", teacher_initials_normalised: "VLSF" },
      { ...demo.timetable[0], id: "bio-oly-kf", subject_raw: "Bio Oly 2", subject_display: "Bio Oly 2", teacher_initials_raw: "KF", teacher_initials_normalised: "KF" },
    ];
    const data = { ...demo, timetable, matches: buildMatches(demo.session.id, timetable, []) };
    expect(previewRows(data)).toEqual([
      { Subject: "Math 1", Teacher: "Ms Seow Chwee Loon Joyce", "Tel. No.": "6516 1724", "Email Add.": "nhsscl@nus.edu.sg" },
      { Subject: "DV 1", Teacher: "Mr Ang Pow Chew", "Tel. No.": "6516 3484", "Email Add.": "powchew@nus.edu.sg" },
      { Subject: "", Teacher: "Dr Yoanna Arlina Kurnianingsih", "Tel. No.": "6516 1508", "Email Add.": "yak@nus.edu.sg" },
      { Subject: "CL 1", Teacher: "Mr Zheng Dehua", "Tel. No.": "6516 1899", "Email Add.": "anhszdh2@nus.edu.sg" },
      { Subject: "TH/TL 1", Teacher: "Mdm Subramanian Vasuki", "Tel. No.": "6516 3650", "Email Add.": "vasuki14@nus.edu.sg" },
      { Subject: "JP 1_Enrich", Teacher: "Mrs Elizabeth Mariko Nishida Gomez", "Tel. No.": "6516 4449", "Email Add.": "nhsemg@nus.edu.sg" },
      { Subject: "CS_Enr 1n2", Teacher: "Phylliscia Lee", "Tel. No.": "6516 7064", "Email Add.": "nhscsp@nus.edu.sg" },
      { Subject: "Bio Oly 2", Teacher: "Ms Lim Suat Fong Valerie", "Tel. No.": "6516 7301", "Email Add.": "nhslsf@nus.edu.sg" },
      { Subject: "", Teacher: "Mrs Fernandez Kalpana", "Tel. No.": "6516 5704", "Email Add.": "nhskalpa@nus.edu.sg" },
    ]);
  });
});
