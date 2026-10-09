import { cn } from "../../lib/utils";
import { useCountUp } from "../../lib/motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accent?: string;
  className?: string;
  wrapTitle?: boolean;
}

export function StatCard({ title, value, icon: Icon, description, trend, accent, className, wrapTitle }: StatCardProps) {
  const isNumeric = typeof value === "number";
  const countRef = useCountUp<HTMLParagraphElement>(isNumeric ? value : 0);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 flex flex-col gap-4 relative overflow-hidden transition-shadow duration-200 shadow-sm hover:shadow-md",
        className
      )}
    >
      {/* Filete superior de acento */}
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent || "var(--brand)" }}
        aria-hidden
      />

      <div className="flex items-center justify-between gap-3">
        <p className={cn("eyebrow", wrapTitle ? "line-clamp-2 leading-tight" : "truncate")}>{title}</p>
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      </div>

      <div>
        {isNumeric ? (
          <p
            ref={countRef}
            className="text-3xl font-bold tracking-tight font-display text-foreground tabular-nums"
          />
        ) : (
          <p className="text-3xl font-bold tracking-tight font-display text-foreground tabular-nums">
            {value}
          </p>
        )}

        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1.5">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-mono text-xs font-medium tabular-nums",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
