import { GraphLoader } from "@/components/GraphLoader";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-[#0b0b10] text-zinc-100">
      <header className="shrink-0 border-b border-white/10 px-5 py-3">
        <h1 className="text-sm font-semibold tracking-tight">MCU Graph</h1>
        <p className="text-xs text-zinc-400">
          Characters, films, teams and powers of the Marvel Cinematic Universe.
          Hover a node to inspect it; scroll to zoom, drag to pan.
        </p>
      </header>

      <main className="min-h-0 flex-1">
        <GraphLoader src="./data/graph.json" />
      </main>
    </div>
  );
}
