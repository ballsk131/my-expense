interface Props {
  /** 0–1 */
  value: number;
  label: string;
}

export function ProgressBar({ value, label }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="tnum text-text-muted">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
