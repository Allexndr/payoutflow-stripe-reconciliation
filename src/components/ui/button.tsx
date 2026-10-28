import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary:
    "bg-primary text-white font-medium shadow-sm shadow-primary/20 hover:bg-primary-hover active:scale-[0.99]",
  secondary:
    "bg-surface text-text border border-border shadow-sm hover:border-border-strong hover:bg-surface-elevated",
  ghost:
    "text-muted hover:text-text hover:bg-[color-mix(in_srgb,var(--text)_4%,transparent)]",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/15",
} as const;

type Props = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  href?: string;
};

export function Button({
  className,
  variant = "primary",
  href,
  children,
  ...props
}: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all disabled:opacity-50",
    variants[variant],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
