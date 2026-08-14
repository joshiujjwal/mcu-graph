"use client";

import type { Tooltip } from "@/lib/graph-view";

const OFFSET = 16;
const ESTIMATED_WIDTH = 260;
const ESTIMATED_HEIGHT = 180;

type Props = {
  readonly tooltip: Tooltip;
  readonly x: number;
  readonly y: number;
};

/** Plain-text hover card. Deliberately not a designed "trading card" — v1 scope. */
export const GraphTooltip = ({ tooltip, x, y }: Props) => {
  // Flip toward the centre near a viewport edge so the card never clips.
  const flipX =
    typeof window !== "undefined" && x + ESTIMATED_WIDTH + OFFSET > window.innerWidth;
  const flipY =
    typeof window !== "undefined" && y + ESTIMATED_HEIGHT + OFFSET > window.innerHeight;

  return (
    <div
      role="tooltip"
      style={{
        left: flipX ? x - ESTIMATED_WIDTH - OFFSET : x + OFFSET,
        top: flipY ? y - ESTIMATED_HEIGHT - OFFSET : y + OFFSET,
      }}
      className="pointer-events-none fixed z-20 w-[260px] rounded-md border border-white/10 bg-zinc-900/95 p-3 text-sm shadow-xl backdrop-blur"
    >
      <p className="font-semibold text-zinc-50">{tooltip.title}</p>
      {tooltip.subtitle !== null && (
        <p className="mt-0.5 text-xs text-zinc-400">{tooltip.subtitle}</p>
      )}

      {tooltip.rows.length > 0 && (
        <dl className="mt-2 space-y-1">
          {tooltip.rows.map((row) => (
            <div key={row.label} className="flex gap-2 text-xs">
              <dt className="w-24 shrink-0 text-zinc-500">{row.label}</dt>
              <dd className="text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
