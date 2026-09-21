import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-text-on-brand hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/40",
  secondary:
    "bg-surface-sunken text-text-primary border border-border-subtle hover:border-border-strong active:bg-surface-base",
  ghost: "text-text-secondary hover:bg-surface-sunken active:bg-surface-base",
  danger: "bg-transparent text-red-600 dark:text-red-400 hover:bg-red-500/10",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-surface-base",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
