# 1. Curated seed as the entity-resolution spine

Date: 2026-08-13
Status: Accepted

## Context

The graph draws on several external sources with incompatible identifiers: the
SuperHero dataset (numeric `id`), TMDB (`tmdbId`), the Marvel API (`marvelId`)
and Wikidata (`Q`-numbers). None of them share a key, and none is complete: the
Marvel API has no powers or MCU film data, the SuperHero dataset has no films,
Wikidata coverage is uneven.

The obvious approach — matching records by character name — fails in ways that
are hard to detect. "Captain Marvel" exists in both Marvel and DC. Aliases
collide ("Hawkeye" is two people). Punctuation and disambiguation suffixes vary
per source. Bad joins would silently produce a wrong graph that still looks
plausible, which is the worst failure mode for a visualization.

## Decision

A hand-curated `data/characters.seed.json` is the canonical spine. Each entry
carries explicit foreign keys for **every** source (`superheroId`, `tmdbId`,
`marvelId`, `wikidataQid`), with `null` for sources not yet integrated.

Enrichment is therefore always a lookup by explicit key. No adapter is permitted
to match by name. Characters not in the seed are not in the graph.

## Consequences

- Joins are correct by construction; a wrong ID is a visible data bug in one
  reviewable file, not an emergent mis-match.
- Adding a backlog source (TMDB, Marvel, Wikidata) is a new adapter plus a new
  join — the compiler does not change.
- The graph size is bounded by curation effort, which is *also* the readability
  constraint we want (~80 characters, not 1,195).
- Cost: adding a character is manual work, and the seed's hand-entered film
  appearances are a known error source until TMDB ingestion lands.
