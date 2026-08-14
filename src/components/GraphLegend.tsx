import { NODE_COLORS } from "@/lib/graph-view";

const ENTRIES = [
  { kind: "character", label: "Character" },
  { kind: "film", label: "Film / series" },
  { kind: "team", label: "Team" },
  { kind: "power", label: "Power" },
] as const;

export const GraphLegend = () => (
  <ul className="pointer-events-none absolute bottom-4 left-4 z-10 space-y-1.5 rounded-md border border-white/10 bg-zinc-900/80 p-3 text-xs backdrop-blur">
    {ENTRIES.map((entry) => (
      <li key={entry.kind} className="flex items-center gap-2 text-zinc-300">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: NODE_COLORS[entry.kind] }}
        />
        {entry.label}
      </li>
    ))}
  </ul>
);
