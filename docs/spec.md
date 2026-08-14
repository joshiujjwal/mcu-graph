# mcu-graph — spec

## What this is

An interactive force-directed graph of the Marvel Cinematic Universe. Characters,
the films they appear in, the teams they belong to and the powers they have are
all nodes in one explorable web — the "graph of things" visual familiar from
Obsidian's graph view.

## v1 scope

Deliberately narrow. Ship the visualization, then decide what deserves more.

| Area | v1 | Backlog |
|---|---|---|
| Visualization | 2D force-directed canvas | 3D toggle |
| Info display | Hover tooltip, plain text | Click-through detail panel, designed cards |
| Data sources | Curated seed + SuperHero dataset | Wikidata, TMDB, Marvel API |
| Interaction | Zoom, pan, neighbour highlight | Filters, search, shortest-path |
| Collectibles | — | Off-chain simulated collection |

**Explicit non-goals for v1:** trading cards, any card visual design, character
detail panels, user accounts, persistence, blockchain anything.

## Graph model

**v1 nodes:** `Character`, `Film` (including Disney+ series), `Team`, `Power`.
Reserved in the type union for backlog sources: `Actor`, `Artifact`.

**v1 edges:** `APPEARS_IN`, `MEMBER_OF`, `HAS_POWER`, `ALLY_OF`, `ENEMY_OF`.
Reserved: `PORTRAYED_BY`, `WIELDS`, `RELATED_TO`.

Node colour encodes type; node radius encodes degree centrality; edge style
encodes relation.

## Tooltip contents (v1)

Name · alignment · one-line role · teams · top three powers · film count.
Plain text. No portrait, no stat bars, no card framing.

## Architecture

Static by design — there is no server and no database.

```
data/characters.seed.json    curated spine (hand-maintained, ~80 characters)
data/raw/superhero.json      committed source snapshot
        -> scripts/build-graph.ts
        -> public/data/graph.json   (generated, gitignored)
        -> fetched by the client, rendered on canvas
```

`scripts/build-graph.ts` is a thin wrapper around the pure function
`src/lib/build-graph.ts`, which does all the joining, deduping and degree
computation and is exhaustively unit-tested.

## Entity resolution

The curated seed is the **spine**. Every character carries explicit foreign keys
to each external source, so enrichment is a dictionary lookup, never a fuzzy name
match (which would silently mis-join "Captain Marvel" the Marvel character with
the DC one, among other traps).

`superheroId` is live in v1. `tmdbId`, `marvelId` and `wikidataQid` exist in the
schema as `null` placeholders so a backlog source becomes a new adapter and a new
join — not a rewrite of the compiler.

## Known limitations

- **Film appearances are hand-entered** in v1, so they are the main source of
  factual error. TMDB ingestion (backlog) replaces them with sourced data.
- **Powerstats are comics values**, not MCU canon. In v1 they only influence node
  sizing; any UI that surfaces them must label them "Comics power stats".
- **~80 characters is a deliberate cap.** The 1,195 entities Wikidata knows about
  would render as an unreadable hairball.

## Legal note

Marvel characters are Disney-owned IP. Displaying them in a free, non-commercial
fan project is fine. Minting or trading them as NFTs is copyright and trademark
infringement — Disney licenses official Marvel NFTs exclusively through VeVe. The
backlog collection layer is therefore an off-chain simulation behind an
`OwnershipProvider` interface, so a chain adapter could later back *original*
artwork without any Marvel asset ever being tokenised.

Adding TMDB or Marvel API data triggers mandatory attribution in the footer.
