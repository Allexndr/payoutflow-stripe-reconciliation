import { randomUUID } from "node:crypto";

export type ParsedBankRow = {
  plaidTxnId: string;
  amountCents: number;
  txnDate: string; // YYYY-MM-DD
  name: string | null;
};

const DATE_KEYS = [
  "date",
  "posted",
  "posting date",
  "transaction date",
  "value date",
  "settle date",
];
const AMOUNT_KEYS = [
  "amount",
  "debit",
  "credit",
  "sum",
  "transaction amount",
];
const NAME_KEYS = [
  "description",
  "memo",
  "name",
  "payee",
  "details",
  "narrative",
  "merchant",
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Split CSV line respecting quoted fields */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function findCol(headers: string[], keys: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const k of keys) {
    const i = norm.indexOf(k);
    if (i >= 0) return i;
  }
  for (let i = 0; i < norm.length; i++) {
    for (const k of keys) {
      if (norm[i]!.includes(k)) return i;
    }
  }
  return -1;
}

function parseAmount(raw: string): number | null {
  let s = raw.replace(/[$€£,\s]/g, "").trim();
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (!s || s === "-") return null;
  let n = Number.parseFloat(s);
  if (neg) n = -n;
  return Number.isFinite(n) ? n : null;
}

/** US/ISO dates → YYYY-MM-DD */
function parseDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
  if (mdy) {
    const m = Number(mdy[1]);
    const d = Number(mdy[2]);
    let y = Number(mdy[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const dmy = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(t);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

/**
 * Parses a bank export CSV: expects a header row with date + amount columns.
 * Amount is stored in cents with sign (negative = credit / money in), like Plaid.
 */
export function parseBankCsv(text: string): {
  rows: ParsedBankRow[];
  error?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { rows: [], error: "File is empty or has no data rows." };
  }

  const headers = splitCsvLine(lines[0]!);
  const dateIdx = findCol(headers, DATE_KEYS);
  const amountIdx = findCol(headers, AMOUNT_KEYS);
  const nameIdx = findCol(headers, NAME_KEYS);

  if (dateIdx < 0 || amountIdx < 0) {
    return {
      rows: [],
      error:
        "Could not find Date and Amount columns. Use headers like Date, Amount, Description.",
    };
  }

  const rows: ParsedBankRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]!);
    const dateRaw = cells[dateIdx] ?? "";
    const amountRaw = cells[amountIdx] ?? "";
    const ymd = parseDate(dateRaw);
    const amountDollars = parseAmount(amountRaw);
    if (!ymd || amountDollars === null) continue;

    const amountCents = Math.round(amountDollars * 100);
    const name =
      nameIdx >= 0 ? (cells[nameIdx]?.trim() || null) : null;

    rows.push({
      plaidTxnId: `csv:${randomUUID()}`,
      amountCents,
      txnDate: ymd,
      name,
    });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      error: "No valid rows. Check date and amount formats.",
    };
  }

  return { rows };
}
