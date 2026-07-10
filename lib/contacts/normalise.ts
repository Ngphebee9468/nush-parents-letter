export function normaliseInitials(value: string | null | undefined) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function cleanEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return email.replace(/^mailto:/, "");
}

export function emailUsername(email: string) {
  return cleanEmail(email).split("@")[0] ?? "";
}

export function normaliseTelephone(
  value: string | number | null | undefined,
  prefix6 = "6516",
  prefix1 = "6601",
) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return { full_telephone: "", telephone_review_required: true };
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
    return { full_telephone: "", telephone_review_required: true };
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
  const map: Record<string, string> = {
    "ELC 6": "English Language and Communication",
    "EL 6": "English Language",
    "BIO 6": "Biology",
    "BIO HON 6": "Biology Honours",
    "PHYS HON 6": "Physics Honours",
    "CHEM HON 6": "Chemistry Honours",
  };
  return map[subject.toUpperCase()] ?? subject;
}
