import { useState } from "react";
import { getCategory } from "../lib/categories";
import { formatBaht, formatDayHeading } from "../lib/format";
import type { Expense } from "../types";
import { Button } from "./ui/Button";
import { ReceiptThumb } from "./ReceiptThumb";

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!expenses.length) return <EmptyState />;

  const days = groupByDay(expenses);

  return (
    <div className="space-y-6">
      {days.map(({ date, items, total }) => (
        <section key={date}>
          <header className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-sm font-medium text-text-secondary">
              {formatDayHeading(date)}
            </h3>
            <span className="tnum text-sm text-text-muted">
              ฿{formatBaht(total)}
            </span>
          </header>

          <ul className="overflow-hidden rounded-[var(--radius-card)] bg-surface-raised shadow-card">
            {items.map((expense, i) => (
              <li key={expense.id} className={i > 0 ? "border-t border-border-subtle" : ""}>
                <Row
                  expense={expense}
                  expanded={openId === expense.id}
                  onToggle={() =>
                    setOpenId(openId === expense.id ? null : expense.id)
                  }
                  onDelete={() => {
                    setOpenId(null);
                    onDelete(expense.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  expense,
  expanded,
  onToggle,
  onDelete,
}: {
  expense: Expense;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const category = getCategory(expense.category);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-sunken"
      >
        <span
          aria-hidden="true"
          style={{ backgroundColor: `color-mix(in oklab, ${category.color} 22%, transparent)` }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        >
          {category.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{expense.merchant}</span>
          <span className="block truncate text-xs text-text-muted">
            {category.label}
            {expense.note ? ` · ${expense.note}` : ""}
          </span>
        </span>

        <span className="tnum shrink-0 font-semibold">
          ฿{formatBaht(expense.amountSatang)}
        </span>
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-3 border-t border-border-subtle bg-surface-sunken px-4 py-4">
          {expense.receiptId ? (
            <ReceiptThumb receiptId={expense.receiptId} />
          ) : (
            <p className="text-sm text-text-muted">ไม่มีรูปใบเสร็จ</p>
          )}
          <Button variant="danger" full onClick={onDelete}>
            ลบรายการนี้
          </Button>
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong px-6 py-14 text-center">
      <p className="mb-1 text-4xl" aria-hidden="true">🧾</p>
      <p className="font-medium">ยังไม่มีรายจ่าย</p>
      <p className="mt-1 text-sm text-text-muted">
        กดปุ่ม + ด้านล่าง แล้วเลือกรูปใบเสร็จจากแกลเลอรีได้เลย
      </p>
    </div>
  );
}

function groupByDay(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const bucket = map.get(expense.date);
    if (bucket) bucket.push(expense);
    else map.set(expense.date, [expense]);
  }

  return [...map.entries()].map(([date, items]) => ({
    date,
    items,
    total: items.reduce((sum, e) => sum + e.amountSatang, 0),
  }));
}
