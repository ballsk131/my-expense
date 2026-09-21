import { CATEGORIES } from "../lib/categories";
import type { CategoryId } from "../types";

interface Props {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="หมวดหมู่" className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category.id)}
            style={
              selected
                ? { backgroundColor: category.color, borderColor: category.color }
                : undefined
            }
            className={[
              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm",
              "transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand-500",
              selected
                ? "border-transparent font-medium text-white"
                : "border-border-subtle bg-surface-sunken text-text-secondary hover:border-border-strong",
            ].join(" ")}
          >
            <span aria-hidden="true">{category.emoji}</span>
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
