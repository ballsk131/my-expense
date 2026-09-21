import { useRef } from "react";

interface Props {
  onPick: (files: File[]) => void;
  disabled?: boolean;
}

/**
 * The two ways into the phone's photos.
 *
 * Both are plain file inputs: the OS picker is the only thing allowed to read
 * the gallery, and it hands back exactly the files the user chose. There is no
 * permission prompt to manage and nothing to request up front — which is also
 * why the app can never browse photos on its own.
 *
 * `capture="environment"` asks for the rear camera directly; without it the
 * same input opens the gallery. Desktop browsers ignore `capture` and show a
 * file dialog, so both buttons still work there.
 */
export function ReceiptPicker({ onPick, disabled }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    // Reset so picking the same file twice in a row still fires `change`.
    input.value = "";
    if (files.length) onPick(files);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handle(e.currentTarget)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handle(e.currentTarget)}
      />

      <PickerButton
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        label="ถ่ายรูป"
        hint="เปิดกล้อง"
        icon={
          <>
            <path d="M3 8a2 2 0 012-2h1.6a2 2 0 001.7-.9l.6-1a1 1 0 01.9-.5h4.4a1 1 0 01.9.5l.6 1a2 2 0 001.7.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </>
        }
      />

      <PickerButton
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
        label="เลือกจากแกลเลอรี"
        hint="เลือกหลายรูปได้"
        icon={
          <>
            <rect x="3" y="4" width="18" height="15" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M21 15l-4.5-4.5L7 19" />
          </>
        }
      />
    </div>
  );
}

function PickerButton({
  onClick,
  disabled,
  label,
  hint,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex flex-col items-center gap-2 rounded-[var(--radius-card)] px-3 py-5",
        "border border-dashed border-border-strong bg-surface-sunken",
        "transition-colors hover:border-brand-500 hover:bg-brand-50/50",
        "dark:hover:bg-brand-900/20",
        "focus-visible:ring-2 focus-visible:ring-brand-500 outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 text-brand-600 dark:text-brand-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
      <span className="text-sm font-medium leading-tight">{label}</span>
      <span className="text-xs text-text-muted">{hint}</span>
    </button>
  );
}
