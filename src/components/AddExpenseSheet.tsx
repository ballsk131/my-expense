import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { Field, TextInput } from "./ui/Field";
import { inputClass } from "./ui/styles";
import { ProgressBar } from "./ui/ProgressBar";
import { Sheet } from "./ui/Sheet";
import { CategoryPicker } from "./CategoryPicker";
import { ReceiptPicker } from "./ReceiptPicker";
import { newId } from "../lib/db";
import { addExpense } from "../lib/store";
import { prepareForStorage } from "../lib/image";
import { OcrUnavailableError, readReceiptText, type OcrProgress } from "../lib/ocr";
import { parseReceipt } from "../lib/parseReceipt";
import { parseBahtInput, todayIso } from "../lib/format";
import type { CategoryId, Expense } from "../types";

interface Draft {
  amount: string;
  merchant: string;
  date: string;
  category: CategoryId;
  note: string;
  photo: File | null;
  confidence: number;
}

const EMPTY_DRAFT: Draft = {
  amount: "",
  merchant: "",
  date: todayIso(),
  category: "other",
  note: "",
  photo: null,
  confidence: 1,
};

type Phase = "pick" | "reading" | "review";

interface Props {
  onClose: () => void;
}

/**
 * Mounted only while open, so every visit starts from a clean draft without an
 * effect that resets state on the way out.
 */
export function AddExpenseSheet({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [progress, setProgress] = useState<OcrProgress>({ stage: "loading", value: 0 });
  const [queue, setQueue] = useState<File[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Revoked on replacement and on unmount so preview blobs are not leaked.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const setPreview = useCallback((file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const runOcr = useCallback(
    async (file: File) => {
      setPhase("reading");
      setWarning(null);
      setProgress({ stage: "loading", value: 0 });
      setPreview(file);

      try {
        const text = await readReceiptText(file, setProgress);
        const parsed = parseReceipt(text);

        setDraft({
          amount: parsed.amountSatang ? (parsed.amountSatang / 100).toFixed(2) : "",
          merchant: parsed.merchant ?? "",
          date: parsed.date ?? todayIso(),
          category: parsed.category,
          note: "",
          photo: file,
          confidence: parsed.confidence,
        });

        if (parsed.confidence < 0.5) {
          setWarning("อ่านใบเสร็จได้ไม่ชัด ช่วยตรวจตัวเลขอีกทีนะครับ");
        }
      } catch (err) {
        // The photo is still worth keeping even when OCR cannot run.
        setDraft({ ...EMPTY_DRAFT, photo: file, confidence: 0 });
        setWarning(
          err instanceof OcrUnavailableError
            ? "อ่านใบเสร็จอัตโนมัติไม่ได้ (อาจไม่ได้ต่อเน็ต) กรอกเองได้เลย"
            : "อ่านใบเสร็จไม่สำเร็จ กรอกเองได้เลย",
        );
      } finally {
        setPhase("review");
      }
    },
    [setPreview],
  );

  const handlePick = useCallback(
    (files: File[]) => {
      const [first, ...rest] = files;
      setQueue(rest);
      void runOcr(first);
    },
    [runOcr],
  );

  const handleManual = useCallback(() => {
    setDraft({ ...EMPTY_DRAFT, photo: null });
    setPreview(null);
    setWarning(null);
    setPhase("review");
  }, [setPreview]);

  const amountSatang = parseBahtInput(draft.amount);
  const canSave = amountSatang !== null && !saving;

  const handleSave = async () => {
    if (amountSatang === null) return;
    setSaving(true);

    try {
      const receiptId = draft.photo ? newId() : undefined;
      const expense: Expense = {
        id: newId(),
        amountSatang,
        merchant: draft.merchant.trim() || "ไม่ระบุร้าน",
        date: draft.date,
        category: draft.category,
        note: draft.note.trim() || undefined,
        receiptId,
        createdAt: Date.now(),
      };

      const stored = draft.photo ? await prepareForStorage(draft.photo) : undefined;
      await addExpense(expense, stored);

      // More photos waiting? Roll straight into the next one.
      const [next, ...rest] = queue;
      if (next) {
        setQueue(rest);
        await runOcr(next);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="เพิ่มรายจ่าย">
      {phase === "pick" && (
        <div className="safe-bottom space-y-4">
          <ReceiptPicker onPick={handlePick} />

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="h-px flex-1 bg-border-subtle" />
            หรือ
            <span className="h-px flex-1 bg-border-subtle" />
          </div>

          <Button variant="secondary" size="lg" full onClick={handleManual}>
            กรอกเอง
          </Button>

          <p className="text-center text-xs leading-relaxed text-text-muted">
            รูปและข้อมูลทั้งหมดเก็บอยู่ในเครื่องคุณเท่านั้น ไม่ได้ส่งขึ้นเซิร์ฟเวอร์
          </p>
        </div>
      )}

      {phase === "reading" && (
        <div className="safe-bottom space-y-5">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="ใบเสร็จที่กำลังอ่าน"
              className="mx-auto max-h-56 rounded-[var(--radius-card)] object-contain shadow-card"
            />
          )}
          <ProgressBar
            value={progress.value}
            label={
              progress.stage === "loading"
                ? "กำลังเตรียมระบบอ่านภาษาไทย…"
                : "กำลังอ่านใบเสร็จ…"
            }
          />
          {queue.length > 0 && (
            <p className="text-center text-sm text-text-muted">
              เหลืออีก {queue.length} รูปหลังจากนี้
            </p>
          )}
        </div>
      )}

      {phase === "review" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {warning && (
            <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {warning}
            </p>
          )}

          {previewUrl && (
            <img
              src={previewUrl}
              alt="ใบเสร็จ"
              className="mx-auto max-h-40 rounded-[var(--radius-card)] object-contain shadow-card"
            />
          )}

          <Field label="จำนวนเงิน (บาท)">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted">
                ฿
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="0.00"
                className={`${inputClass} tnum h-14 pl-9 text-2xl font-semibold`}
              />
            </div>
          </Field>

          <Field label="ร้าน / รายการ">
            <TextInput
              value={draft.merchant}
              onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
              placeholder="เช่น 7-Eleven สาขาสีลม"
            />
          </Field>

          <Field label="วันที่">
            <TextInput
              type="date"
              value={draft.date}
              max={todayIso()}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>

          <Field label="หมวดหมู่">
            <CategoryPicker
              value={draft.category}
              onChange={(category) => setDraft({ ...draft, category })}
            />
          </Field>

          <Field label="บันทึกเพิ่มเติม" hint="ไม่ใส่ก็ได้">
            <TextInput
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="เช่น เลี้ยงลูกค้า"
            />
          </Field>

          <div className="safe-bottom sticky bottom-0 -mx-5 border-t border-border-subtle bg-surface-raised px-5 pt-4">
            <Button type="submit" size="lg" full disabled={!canSave}>
              {saving
                ? "กำลังบันทึก…"
                : queue.length > 0
                  ? `บันทึก แล้วไปรูปถัดไป (${queue.length})`
                  : "บันทึก"}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
