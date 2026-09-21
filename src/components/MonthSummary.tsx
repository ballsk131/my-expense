import { formatBaht, formatMonth } from "../lib/format";

interface Props {
  monthKey: string;
  totalSatang: number;
  previousSatang: number | null;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * A hero number, not a chart: one month's spend is a single magnitude, and a
 * plot of one value says less than the value typeset large.
 */
export function MonthSummary({
  monthKey,
  totalSatang,
  previousSatang,
  count,
  onPrev,
  onNext,
  canGoNext,
}: Props) {
  const delta =
    previousSatang && previousSatang > 0
      ? (totalSatang - previousSatang) / previousSatang
      : null;

  return (
    <section className="rounded-[var(--radius-card)] bg-surface-raised px-5 py-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <StepButton onClick={onPrev} label="เดือนก่อนหน้า" direction="prev" />
        <h2 className="text-sm font-medium text-text-secondary">
          {formatMonth(monthKey)}
        </h2>
        <StepButton
          onClick={onNext}
          label="เดือนถัดไป"
          direction="next"
          disabled={!canGoNext}
        />
      </div>

      <p className="tnum text-center text-[length:var(--text-display)] leading-[1.1] font-semibold tracking-[-0.02em]">
        <span className="mr-1 text-2xl font-normal text-text-muted">฿</span>
        {formatBaht(totalSatang)}
      </p>

      <p className="mt-2 text-center text-sm text-text-muted">
        {count} รายการ
        {delta !== null && (
          <>
            {" · "}
            <span className={delta > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%
            </span>{" "}
            จากเดือนก่อน
          </>
        )}
      </p>
    </section>
  );
}

function StepButton({
  onClick,
  label,
  direction,
  disabled,
}: {
  onClick: () => void;
  label: string;
  direction: "prev" | "next";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-sunken disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
