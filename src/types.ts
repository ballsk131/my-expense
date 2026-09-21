export type CategoryId =
  | "food"
  | "transport"
  | "shopping"
  | "bills"
  | "health"
  | "fun"
  | "other";

export interface Expense {
  id: string;
  /** Amount in satang (integer) so arithmetic never drifts. */
  amountSatang: number;
  merchant: string;
  /** ISO date, day precision: YYYY-MM-DD */
  date: string;
  category: CategoryId;
  note?: string;
  /** Key into the `receipts` store, when the entry came from a photo. */
  receiptId?: string;
  createdAt: number;
}

/** What the OCR pass believes it found, before the user confirms it. */
export interface ParsedReceipt {
  amountSatang: number | null;
  merchant: string | null;
  date: string | null;
  category: CategoryId;
  /** 0–1. Drives how loudly the UI asks the user to double-check. */
  confidence: number;
  rawText: string;
}
