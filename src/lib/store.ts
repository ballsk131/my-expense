import { deleteExpense, listExpenses, saveExpense } from "./db";
import type { Expense } from "../types";

export interface ExpenseState {
  items: Expense[];
  loading: boolean;
}

/**
 * IndexedDB is an external store, so the app reads it through
 * `useSyncExternalStore` rather than mirroring it into component state.
 * The snapshot object is replaced only when the data actually changes, which
 * is what keeps the hook from looping.
 */
let state: ExpenseState = { items: [], loading: true };
const listeners = new Set<() => void>();
let started = false;

function emit(next: ExpenseState) {
  state = next;
  for (const listener of listeners) listener();
}

async function reload() {
  emit({ items: await listExpenses(), loading: false });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // The first subscriber triggers the initial read; later ones reuse it.
  if (!started) {
    started = true;
    void reload();
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ExpenseState {
  return state;
}

/** Server rendering has no IndexedDB; hand back a stable empty state. */
const EMPTY: ExpenseState = { items: [], loading: true };
export function getServerSnapshot(): ExpenseState {
  return EMPTY;
}

export async function addExpense(expense: Expense, receipt?: Blob) {
  await saveExpense(expense, receipt);
  await reload();
}

export async function removeExpense(id: string) {
  await deleteExpense(id);
  await reload();
}
