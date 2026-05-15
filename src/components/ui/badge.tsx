import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-zinc-800 text-zinc-200",
  success: "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  warning: "bg-amber-900/50 text-amber-300 border border-amber-800",
  danger: "bg-red-900/50 text-red-300 border border-red-800",
  info: "bg-blue-900/50 text-blue-300 border border-blue-800",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
