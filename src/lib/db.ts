import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Expense } from "../types";

interface ExpenseDB extends DBSchema {
  expenses: {
    key: string;
    value: Expense;
    indexes: { "by-date": string };
  };
  /** Receipt images live in their own store so listing expenses stays cheap. */
  receipts: {
    key: string;
    value: { id: string; blob: Blob };
  };
}

let dbPromise: Promise<IDBPDatabase<ExpenseDB>> | null = null;

function getDb() {
  dbPromise ??= openDB<ExpenseDB>("my-expense", 1, {
    upgrade(db) {
      const expenses = db.createObjectStore("expenses", { keyPath: "id" });
      expenses.createIndex("by-date", "date");
      db.createObjectStore("receipts", { keyPath: "id" });
    },
  });
  return dbPromise;
}

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("expenses", "by-date");
  // Newest first; within a day, most recently entered first.
  return all.reverse().sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

export async function saveExpense(expense: Expense, receipt?: Blob) {
  const db = await getDb();
  const tx = db.transaction(["expenses", "receipts"], "readwrite");
  await tx.objectStore("expenses").put(expense);
  if (receipt && expense.receiptId) {
    await tx.objectStore("receipts").put({ id: expense.receiptId, blob: receipt });
  }
  await tx.done;
}

export async function deleteExpense(id: string) {
  const db = await getDb();
  const expense = await db.get("expenses", id);
  const tx = db.transaction(["expenses", "receipts"], "readwrite");
  await tx.objectStore("expenses").delete(id);
  if (expense?.receiptId) {
    await tx.objectStore("receipts").delete(expense.receiptId);
  }
  await tx.done;
}

export async function getReceiptBlob(receiptId: string): Promise<Blob | null> {
  const db = await getDb();
  const row = await db.get("receipts", receiptId);
  return row?.blob ?? null;
}

export function newId(): string {
  return crypto.randomUUID();
}
