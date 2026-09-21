const BAHT = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BAHT_COMPACT = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

export function formatBaht(satang: number): string {
  return BAHT.format(satang / 100);
}

export function formatBahtCompact(satang: number): string {
  return BAHT_COMPACT.format(Math.round(satang / 100));
}

/** "12 ก.ย." — day and short month, the granularity a list needs. */
export function formatDayMonth(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function formatFullDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Heading for a day group: "วันนี้" / "เมื่อวาน" / full date. */
export function formatDayHeading(isoDate: string): string {
  if (isoDate === todayIso()) return "วันนี้";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === toIsoDate(yesterday)) return "เมื่อวาน";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatMonth(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** "2026-09" — the key expenses are grouped by on the stats screen. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKey(todayIso());
}

/** Parse free-typed baht ("1,234.50") into satang. Returns null if unusable. */
export function parseBahtInput(input: string): number | null {
  const cleaned = input.replace(/[,\s฿]/g, "");
  if (!cleaned || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const baht = Number(cleaned);
  if (!Number.isFinite(baht) || baht <= 0) return null;
  return Math.round(baht * 100);
}
