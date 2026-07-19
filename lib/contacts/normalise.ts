export function normaliseInitials(value: string | null | undefined) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function cleanEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  const cleaned = email.replace(/^mailto:/, "");
  if (/^[a-z0-9._-]+$/i.test(cleaned) && /[a-z]/i.test(cleaned)) return `${cleaned}@nus.edu.sg`;
  return cleaned;
}

export function emailUsername(email: string) {
  return cleanEmail(email).split("@")[0] ?? "";
}

export function initialsFromEmailUsername(value: string | null | undefined) {
  const username = emailUsername(String(value ?? "").includes("@") ? String(value ?? "") : `${value ?? ""}@example.invalid`);
  return normaliseInitials(username.replace(/^(anhs|nhs|nush|sst|staff|teacher)/i, ""));
}

export function normaliseTelephone(
  value: string | number | null | undefined,
  prefix6 = "6516",
  prefix1 = "6601",
) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return { full_telephone: raw, telephone_review_required: true };
  if (digits.length === 8 && digits.startsWith(prefix6)) {
    return { full_telephone: `${prefix6} ${digits.slice(4)}`, telephone_review_required: false };
  }
  if (digits.length === 8 && digits.startsWith(prefix1)) {
    return { full_telephone: `${prefix1} ${digits.slice(4)}`, telephone_review_required: false };
  }
  if (digits.length === 5 && digits.startsWith("6")) {
    return { full_telephone: `${prefix6} ${digits.slice(1)}`, telephone_review_required: false };
  }
  if (digits.length === 5 && digits.startsWith("1")) {
    return { full_telephone: `${prefix1} ${digits.slice(1)}`, telephone_review_required: false };
  }
  if (digits.length === 4) {
    return { full_telephone: raw, telephone_review_required: true };
  }
  return { full_telephone: raw, telephone_review_required: true };
}

export function nameDerivedInitials(name: string) {
  return name
    .replace(/\b(MR|MS|MRS|MDM|DR|PROF)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function safeExportCell(value: string | null | undefined) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function subjectDisplay(subject: string) {
  const cleaned = subject
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(Bio Oly \d+)[A-Z]{2,5}$/i, "$1")
    .replace(/^(CS_Enr 1n2)[A-Z]{2,5}$/i, "$1")
    .replace(/^(Chem Pot \d+)[A-Z]{2,5}$/i, "$1");
  const upper = cleaned.toUpperCase();
  const map: Record<string, string> = {
    "ELC 6": "English Language and Communication",
    "EL 6": "English Language",
    "BIO 6": "Biology",
    "BIO HON 6": "Biology Honours",
    "PHYS HON 6": "Physics Honours",
    "CHEM HON 6": "Chemistry Honours",
    "PE": "Physical Education",
    "DV JM": "Da Vinci Junior Science Maker",
    "DV JSR": "Da Vinci Junior Science Research",
    "DV JMR": "Da Vinci Junior Math Research",
  };
  if (map[upper]) return map[upper];

  const yearSubject = (label: string) => {
    const match = upper.match(/^(.+?)\s*(\d)$/);
    if (!match) return null;
    return `Year ${match[2]} ${label}`;
  };

  if (/^MATH\s*\d$/.test(upper)) return yearSubject("Math") ?? cleaned;
  if (/^EL\s*\d$/.test(upper) || /^EL\d$/.test(upper)) return yearSubject("English") ?? cleaned;
  if (/^HUM\s*\d$/.test(upper)) return yearSubject("Humanities") ?? cleaned;
  if (/^PHYSICS\s*\d$/.test(upper)) return yearSubject("Physics") ?? cleaned;
  if (/^CS\s*\d$/.test(upper)) return yearSubject("Computer Science") ?? cleaned;
  if (/^(BIO|BL)\s*\d$/.test(upper)) return `Year ${upper.match(/\d$/)?.[0]} Biology`;
  if (/^CL3\s*YR\s*\d$/.test(upper) || /^CL\s*\d$/.test(upper)) return `Year ${upper.match(/\d$/)?.[0]} Chinese`;
  if (/^ML3\s*YR\s*\d$/.test(upper) || /^ML\s*\d$/.test(upper)) return `Year ${upper.match(/\d$/)?.[0]} Malay`;
  if (/^GEOG\s*\d$/.test(upper)) return yearSubject("Geography") ?? cleaned;
  if (/^HIST\s*\d$/.test(upper)) return yearSubject("History") ?? cleaned;
  if (/^ENG LIT\s*\d$/.test(upper)) return yearSubject("English Literature") ?? cleaned;
  if (/^MUSIC\s*\d$/.test(upper)) return yearSubject("Music") ?? cleaned;
  if (/^DV\s*JM\s*\d?$/.test(upper)) return "Da Vinci Junior Science Maker";
  if (/^DV\s*JSR\s*\d?$/.test(upper)) return "Da Vinci Junior Science Research";
  if (/^DV\s*JMR\s*\d?$/.test(upper)) return "Da Vinci Junior Math Research";

  return cleaned;
}
