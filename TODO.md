# TODO

## v1 — shipped ✅

- [x] Scaffold: Next 16 + TS strict + Tailwind v4 + Vitest, `output: 'export'`
- [x] Domain model (`src/types/graph.ts`) + ADRs
- [x] Curated seed: 71 characters, 41 films
- [x] SuperHero ingestion adapter (verified live: 58/58 IDs resolved)
- [x] Graph compiler (pure, 18 tests) → 167 nodes / 661 links
- [x] Force-directed canvas with neighbour highlighting
- [x] Plain-text hover tooltip + keyboard-reachable node list
- [x] Perf/a11y/mobile pass, README with screenshots

## Backlog

- [ ] **Wikidata ingestion** — `P1080 = Q642878` (1,195 entities), abilities via
      `P2563`. No API key; send a descriptive User-Agent.
- [ ] **TMDB ingestion** — replaces hand-entered film appearances with sourced
      data; adds `Actor` nodes and `PORTRAYED_BY` edges. Triggers attribution.
- [ ] **Marvel API ingestion** — official bios and thumbnails only (no powers, no
      MCU films). md5-signed keys, 3,000 calls/day. Triggers attribution.
- [ ] **Filters and search** — by film, team, alignment, power; fuzzy search;
      shortest path between two characters.
- [ ] **Detail panel** — click-through; the point at which a designed card
      treatment becomes worth doing. Label stats "Comics power stats".
- [ ] **Collection layer** — off-chain, local-first, behind an `OwnershipProvider`
      interface. No blockchain, no minting of Marvel IP (see README legal note).

## Data quality

- [ ] Expand the seed beyond 71 characters (Eternals, Fantastic Four, X-Men)
- [ ] 13 characters still lack a `superheroId` (Valkyrie, Heimdall, Yondu, Ronan,
      Killmonger, Shuri, Okoye, Wong, Pepper Potts, Maria Hill, Coulson, Hank Pym,
      Monica Rambeau) — they have no powerstats and size only by degree.
