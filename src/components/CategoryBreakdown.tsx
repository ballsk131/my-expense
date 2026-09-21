import { useState } from "react";
import { CATEGORIES, getCategory } from "../lib/categories";
import { formatBaht } from "../lib/format";
import type { CategoryId, Expense } from "../types";

interface Props {
  expenses: Expense[];
}

interface Slice {
  id: CategoryId;
  satang: number;
  count: number;
}

/**
 * Ranked horizontal bars: the job is comparing magnitudes across a handful of
 * named things, which a bar length reads faster than any angle in a pie.
 *
 * Every bar is directly labelled with its category and amount, so identity and
 * value never depend on the colour — which is what lets the palette sit at its
 * CVD floor, and what the validator's contrast warning requires.
 */
export function CategoryBreakdown({ expenses }: Props) {
  const [showTable, setShowTable] = useState(false);

  const slices = summarise(expenses);
  const total = slices.reduce((sum, s) => sum + s.satang, 0);

  if (!total) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-border-strong px-5 py-10 text-center text-sm text-text-muted">
        เดือนนี้ยังไม่มีรายจ่าย
      </p>
    );
  }

  const max = Math.max(...slices.map((s) => s.satang));

  return (
    <section className="rounded-[var(--radius-card)] bg-surface-raised px-5 py-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">แยกตามหมวด</h2>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          {showTable ? "ดูเป็นกราฟ" : "ดูเป็นตาราง"}
        </button>
      </div>

      {showTable ? (
        <Table slices={slices} total={total} />
      ) : (
        <ul className="space-y-3.5">
          {slices.map((slice) => {
            const category = getCategory(slice.id);
            const share = slice.satang / total;
            return (
              <li key={slice.id}>
                <div className="mb-1.5 flex items-baseline gap-2 text-sm">
                  <span aria-hidden="true">{category.emoji}</span>
                  <span className="font-medium">{category.label}</span>
                  <span className="tnum ml-auto font-semibold">
                    ฿{formatBaht(slice.satang)}
                  </span>
                  <span className="tnum w-10 text-right text-xs text-text-muted">
                    {Math.round(share * 100)}%
                  </span>
                </div>

                {/* The track is the axis: no gridlines compete with the marks. */}
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      // A 1% category still has to read as a bar, not a dot.
                      width: `max(0.625rem, ${(slice.satang / max) * 100}%)`,
                      backgroundColor: category.color,
                    }}
                    title={`${category.label} · ${slice.count} รายการ · ฿${formatBaht(slice.satang)}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Table({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
          <th scope="col" className="pb-2 font-medium">หมวด</th>
          <th scope="col" className="pb-2 text-right font-medium">รายการ</th>
          <th scope="col" className="pb-2 text-right font-medium">จำนวนเงิน</th>
          <th scope="col" className="pb-2 text-right font-medium">สัดส่วน</th>
        </tr>
      </thead>
      <tbody>
        {slices.map((slice) => {
          const category = getCategory(slice.id);
          return (
            <tr key={slice.id} className="border-b border-border-subtle last:border-0">
              <th scope="row" className="py-2 text-left font-normal">
                <span aria-hidden="true" className="mr-1.5">{category.emoji}</span>
                {category.label}
              </th>
              <td className="tnum py-2 text-right text-text-secondary">{slice.count}</td>
              <td className="tnum py-2 text-right font-medium">
                ฿{formatBaht(slice.satang)}
              </td>
              <td className="tnum py-2 text-right text-text-secondary">
                {Math.round((slice.satang / total) * 100)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function summarise(expenses: Expense[]): Slice[] {
  const totals = new Map<CategoryId, Slice>();

  for (const expense of expenses) {
    const slice = totals.get(expense.category);
    if (slice) {
      slice.satang += expense.amountSatang;
      slice.count += 1;
    } else {
      totals.set(expense.category, {
        id: expense.category,
        satang: expense.amountSatang,
        count: 1,
      });
    }
  }

  // Ties resolve by the fixed category order, so a category never changes
  // colour or position just because two months happen to match.
  const order = new Map(CATEGORIES.map((c, i) => [c.id, i]));
  return [...totals.values()].sort((a, b) =>
    b.satang - a.satang || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}
