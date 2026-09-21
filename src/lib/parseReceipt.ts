import type { ParsedReceipt } from "../types";
import { guessCategory } from "./categories";
import { toIsoDate } from "./format";

/**
 * Words that sit next to the figure we actually want. Ordered strongest first:
 * a line saying "รวมทั้งสิ้น" beats one saying "รวม", which beats a bare
 * subtotal, so a receipt listing several totals still yields the final one.
 */
const TOTAL_KEYWORDS: { words: string[]; weight: number }[] = [
  { words: ["รวมทั้งสิ้น", "ยอดสุทธิ", "รวมสุทธิ", "grand total", "net total", "amount due"], weight: 3 },
  { words: ["ยอดรวม", "total", "รวมเงิน", "จำนวนเงิน"], weight: 2 },
  { words: ["รวม", "subtotal", "sub total", "ยอด"], weight: 1 },
];

/** Lines matching these never hold the grand total, however they are worded. */
const TOTAL_EXCLUSIONS = [
  "vat", "ภาษี", "ส่วนลด", "discount", "เงินสด", "cash", "เงินทอน", "change",
  "point", "แต้ม", "ก่อนภาษี", "before vat",
];

const THAI_MONTHS = [
  ["ม.ค", "มกราคม", "jan"],
  ["ก.พ", "กุมภาพันธ์", "feb"],
  ["มี.ค", "มีนาคม", "mar"],
  ["เม.ย", "เมษายน", "apr"],
  ["พ.ค", "พฤษภาคม", "may"],
  ["มิ.ย", "มิถุนายน", "jun"],
  ["ก.ค", "กรกฎาคม", "jul"],
  ["ส.ค", "สิงหาคม", "aug"],
  ["ก.ย", "กันยายน", "sep"],
  ["ต.ค", "ตุลาคม", "oct"],
  ["พ.ย", "พฤศจิกายน", "nov"],
  ["ธ.ค", "ธันวาคม", "dec"],
];

/** Matches 1234, 1,234.50, 1 234.50 — with or without a ฿ prefix. */
const MONEY = /(?:฿|บาท)?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:บาท|฿|thb)?/gi;

function toSatang(raw: string): number | null {
  const n = Number(raw.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  // Receipts above ten million baht are far more likely to be a misread
  // barcode or tax ID than a real total.
  if (n > 10_000_000) return null;
  return Math.round(n * 100);
}

function numbersIn(line: string): number[] {
  const out: number[] = [];
  for (const match of line.matchAll(MONEY)) {
    const satang = toSatang(match[1]);
    if (satang !== null) out.push(satang);
  }
  return out;
}

/**
 * Buddhist-era years are ~543 ahead. Anything past 2400 is clearly BE; a bare
 * two-digit year is assumed to be this century.
 */
function normaliseYear(year: number): number {
  if (year > 2400) return year - 543;
  if (year < 100) {
    const y = 2000 + year;
    return y > 2400 ? y - 543 : y;
  }
  return year;
}

function buildDate(day: number, month: number, year: number): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const ce = normaliseYear(year);
  if (ce < 2000 || ce > 2100) return null;

  const d = new Date(ce, month - 1, day);
  // Rejects things like 31/02 that Date would silently roll forward.
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  // A receipt dated in the future is a parse error, not a prophecy.
  if (d.getTime() > Date.now() + 86_400_000) return null;

  return toIsoDate(d);
}

export function extractDate(text: string): string | null {
  // dd/mm/yyyy, dd-mm-yy, dd.mm.yyyy
  for (const m of text.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g)) {
    const iso = buildDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) return iso;
  }

  // yyyy-mm-dd
  for (const m of text.matchAll(/\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/g)) {
    const iso = buildDate(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) return iso;
  }

  // "12 ก.ย. 2569" / "12 Sep 2026"
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(/\b(\d{1,2})\s*([ก-ฮ][ก-ฮ.]*|[a-z]{3,9})\.?\s*(\d{2,4})\b/g)) {
    const monthIndex = THAI_MONTHS.findIndex((names) =>
      names.some((n) => m[2].startsWith(n)),
    );
    if (monthIndex === -1) continue;
    const iso = buildDate(Number(m[1]), monthIndex + 1, Number(m[3]));
    if (iso) return iso;
  }

  return null;
}

export function extractAmount(text: string): { satang: number; strong: boolean } | null {
  const lines = text.split("\n");
  let best: { satang: number; weight: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (TOTAL_EXCLUSIONS.some((w) => lower.includes(w))) continue;

    const rule = TOTAL_KEYWORDS.find((r) => r.words.some((w) => lower.includes(w)));
    if (!rule) continue;

    // Thermal printers often wrap the figure onto the following line.
    const onLine = numbersIn(line);
    const candidates = onLine.length ? onLine : numbersIn(lines[i + 1] ?? "");
    if (!candidates.length) continue;

    // On a "TOTAL  2 items  350.00" line the rightmost figure is the money.
    const satang = candidates[candidates.length - 1];
    // `>=` lets later lines win ties: the grand total sits below the subtotal.
    if (best === null || rule.weight >= best.weight) {
      best = { satang, weight: rule.weight };
    }
  }

  if (best !== null) return { satang: best.satang, strong: true };

  // No keyword anywhere — fall back to the largest figure on the receipt and
  // flag it as weak so the UI asks the user to confirm.
  const all = numbersIn(text);
  if (!all.length) return null;
  return { satang: Math.max(...all), strong: false };
}

/**
 * The shop name is almost always in the first few lines, above the address.
 * Skip lines that are mostly digits (tax IDs, phone numbers, branch codes).
 */
export function extractMerchant(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 48) continue;

    const digits = (line.match(/\d/g) ?? []).length;
    if (digits / line.length > 0.3) continue;
    if (/^(ใบเสร็จ|ใบกำกับ|tax invoice|receipt|บิล)/i.test(line)) continue;

    return line.replace(/\s{2,}/g, " ");
  }

  return null;
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const amount = extractAmount(rawText);
  const date = extractDate(rawText);
  const merchant = extractMerchant(rawText);

  // Confidence is what the UI uses to decide how hard to nudge the user.
  let confidence = 0;
  if (amount) confidence += amount.strong ? 0.55 : 0.2;
  if (date) confidence += 0.25;
  if (merchant) confidence += 0.2;

  return {
    amountSatang: amount?.satang ?? null,
    merchant,
    date,
    category: guessCategory(`${merchant ?? ""}\n${rawText}`),
    confidence: Math.min(1, confidence),
    rawText,
  };
}
