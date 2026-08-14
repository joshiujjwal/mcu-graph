<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — mcu-graph

An interactive force-directed visualization of the Marvel Cinematic Universe:
characters, films, teams and powers as one explorable graph. Next.js 16 (App
Router, TS) + `react-force-graph-2d`, with **no database** — data is compiled at
build time into a static `public/data/graph.json`.

## Scope discipline

v1 is **the visualization and nothing else**: the graph, plus a plain-text hover
tooltip. No trading cards, no detail panel, no collection/ownership layer. Those
are backlog items — do not build them ahead of schedule. See `docs/spec.md`.

## Setup
```bash
npm install
npm run ingest:superhero   # refresh data/raw/superhero.json (no API key needed)
npm run build:graph        # compile data/ -> public/data/graph.json
npm run dev                # http://localhost:3000
```

## Data flow

```
data/characters.seed.json   curated spine, ~80 MCU characters (hand-maintained)
data/raw/superhero.json     committed snapshot of the SuperHero dataset
        -> scripts/build-graph.ts (pure, unit-tested)
        -> public/data/graph.json (generated, gitignored)
```

`data/raw/` is **committed on purpose**: builds stay reproducible, offline, and
free of rate limits in CI. Re-run the ingest script to refresh it.

Enrichment is a **lookup by explicit foreign key, never a fuzzy name match**.
Each seed character carries `superheroId` (live) plus `tmdbId` / `marvelId` /
`wikidataQid` (reserved as `null` for backlog sources).

## Code style
- TypeScript strict mode; avoid `any` without a comment explaining why.
- Functional/declarative over imperative; `const` over `let`; never `var`.
- `async`/`await`, not `.then()` chains.
- Named exports, not default exports — except React components and Next.js
  page/route files, which Next.js requires to be default exports.
- Early returns over nested conditionals.
- Only comment non-obvious logic (why, not what).

## Testing (red/green TDD)
1. Write a failing test in `tests/` (mirrors `src/`) before the implementation.
2. Confirm it fails for the right reason.
3. Implement until it passes. Run `npm test`.
4. Don't remove or weaken existing tests to make something pass.
- `src/lib/build-graph.ts` is a pure function and must stay that way — it is the
  correctness core and is tested exhaustively. No fetching, no filesystem access.
- Ingestion adapters are tested against a mocked `fetch`. If you run one against
  live credentials, record what actually happened here.

## Verified data-source notes
- **SuperHero dataset** (`akabab.github.io/superhero-api`) — verified live:
  563 characters, ~918 KB, no API key. Powerstats are **comics** values, not MCU
  canon; label them as such wherever they surface in the UI.
- **Wikidata** (backlog) — verified: 1,195 MCU entities via `P1080 = Q642878`;
  abilities via `P2563`. No API key; send a descriptive User-Agent.
- **TMDB** (backlog) — needs a key; the only good source of MCU film appearances.
- **Marvel API** (backlog) — needs md5-signed keys, 3,000 calls/day, and is
  comics-centric: **no powers data, no MCU film data**. Bios and art only.

## Legal constraint (read before touching the backlog collection layer)
Marvel characters are Disney-owned IP. Displaying them in a free fan project is
fine; minting or trading them as NFTs is infringement — Disney licenses official
Marvel NFTs exclusively through VeVe. The collection layer therefore stays an
**off-chain simulation** behind an interface. Never tokenise Marvel assets.
Adding TMDB or Marvel API data triggers mandatory attribution in the footer.

## Before opening a PR
- Run `npm run build && npm run lint && npm test` — all three must pass.
- Include evidence: command output, or a screenshot of the actual running graph
  for UI changes. A description of intended behavior is not evidence.
- Re-read your own diff before asking for review.
- Keep PRs scoped to one concern.
