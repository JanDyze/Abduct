"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// One series of daily columns (the last 30 days). Columns are at most 24px wide with a 4px
// rounded top and a 2px gap, grown from a hairline baseline; the scale's top is a round number.
// Hover or tap a day for its value; a table carries the same numbers for screen readers.

function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= n) return m * step;
  return 10 * step;
}

const dayLabel = (day: string, style: "short" | "long") =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(style === "long" ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });

export function ColumnChart({ data, unit, label }: { data: { day: string; value: number }[]; unit: [string, string]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const shown = hover ?? data.length - 1;
  const at = data[shown];
  const word = (n: number) => (n === 1 ? unit[0] : unit[1]);

  return (
    <figure>
      <figcaption className="mb-4 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{hover === null ? "Today" : dayLabel(at.day, "long")}</span>
        <span className="font-medium tabular-nums">
          {at.value.toLocaleString()} {word(at.value)}
        </span>
      </figcaption>
      <div className="relative h-36" onPointerLeave={() => setHover(null)}>
        {/* hairline grid: the top of the scale, the middle, and the baseline */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${f * 100}%` }} aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="w-6 -translate-y-px text-right text-[0.65rem] leading-none text-muted-foreground tabular-nums">
              {Math.round(max * f).toLocaleString()}
            </span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-8 left-0 flex items-end gap-[2px]" aria-hidden>
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              tabIndex={-1}
              onPointerEnter={() => setHover(i)}
              onClick={() => setHover(i)}
              className="flex h-full flex-1 items-end justify-center"
            >
              <span
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] transition-colors",
                  i === shown ? "bg-primary" : "bg-primary/45",
                  d.value === 0 && "bg-transparent",
                )}
                style={{ height: `${(d.value / max) * 100}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pr-8 text-[0.65rem] text-muted-foreground" aria-hidden>
        <span>{dayLabel(data[0].day, "short")}</span>
        <span>{dayLabel(data[data.length - 1].day, "short")}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
