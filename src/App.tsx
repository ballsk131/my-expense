import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AddExpenseSheet } from "./components/AddExpenseSheet";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { ExpenseList } from "./components/ExpenseList";
import { MonthSummary } from "./components/MonthSummary";
import {
  getServerSnapshot,
  getSnapshot,
  removeExpense,
  subscribe,
} from "./lib/store";
import { currentMonthKey, monthKey } from "./lib/format";
import { releaseOcr } from "./lib/ocr";

type Tab = "list" | "stats";

export default function App() {
  const { items: expenses, loading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [tab, setTab] = useState<Tab>("list");
  const [month, setMonth] = useState(currentMonthKey());
  const [adding, setAdding] = useState(false);

  // The OCR worker holds several MB of language data; hand it back when the
  // app is backgrounded so the OS is less likely to kill the tab.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") void releaseOcr();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  const inMonth = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === month),
    [expenses, month],
  );

  const previousMonth = useMemo(() => shiftMonth(month, -1), [month]);

  const previousTotal = useMemo(() => {
    const items = expenses.filter((e) => monthKey(e.date) === previousMonth);
    return items.length
      ? items.reduce((sum, e) => sum + e.amountSatang, 0)
      : null;
  }, [expenses, previousMonth]);

  const total = inMonth.reduce((sum, e) => sum + e.amountSatang, 0);

  const handleDelete = (id: string) => removeExpense(id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-semibold">รายจ่ายของฉัน</h1>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-32">
        <MonthSummary
          monthKey={month}
          totalSatang={total}
          previousSatang={previousTotal}
          count={inMonth.length}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, 1))}
          canGoNext={month < currentMonthKey()}
        />

        <nav className="flex gap-1 rounded-full bg-surface-sunken p-1" role="tablist">
          <TabButton active={tab === "list"} onClick={() => setTab("list")}>
            รายการ
          </TabButton>
          <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
            สรุป
          </TabButton>
        </nav>

        {loading ? (
          <p className="py-10 text-center text-sm text-text-muted">กำลังโหลด…</p>
        ) : tab === "list" ? (
          <ExpenseList expenses={inMonth} onDelete={handleDelete} />
        ) : (
          <CategoryBreakdown expenses={inMonth} />
        )}
      </main>

      {/* Thumb-reachable, clear of the home indicator. */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg justify-center px-4">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={[
            "pointer-events-auto flex h-14 items-center gap-2 rounded-full px-7",
            "bg-brand-600 font-medium text-text-on-brand shadow-lg shadow-brand-900/25",
            "transition-transform active:scale-95",
            "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface-base outline-none",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          เพิ่มรายจ่าย
        </button>
      </div>

      {adding && (
        <AddExpenseSheet onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex-1 rounded-full py-2 text-sm font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500",
        active
          ? "bg-surface-raised text-text-primary shadow-card"
          : "text-text-secondary hover:text-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** "2026-09" +/- n months, staying on the first of the month. */
function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
