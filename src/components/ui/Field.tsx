import type { InputHTMLAttributes, ReactNode } from "react";
import { inputClass } from "./styles";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${inputClass} h-12 ${className}`} {...rest} />;
}
