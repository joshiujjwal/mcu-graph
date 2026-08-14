# 2. Static export, no database

Date: 2026-08-13
Status: Accepted

## Context

The reference project in this workspace (`podcast-guest-graph`) runs Postgres via
Prisma. For mcu-graph the entire dataset is a few hundred nodes derived from
sources that change on the order of *months* (a new film, a new character), and
v1 has no user-generated state at all — no accounts, no persistence, no writes.

A database would mean Docker, migrations, a connection string, and a hosting bill,
all to serve a payload small enough to be a single JSON file.

## Decision

Set `output: 'export'` in `next.config.ts`. Compile the graph at build time into
`public/data/graph.json` and fetch it from the client. No server, no database.

`data/raw/` is committed so the build is reproducible and offline: CI never hits
an external API, so it can't fail on a rate limit or an upstream outage.

## Consequences

- Deploys as static files anywhere, free.
- The build is deterministic and CI is hermetic. Refreshing source data is an
  explicit, reviewable commit (`npm run ingest:superhero`), not a silent drift.
- No API routes and no server-side rendering of data — everything the client
  needs must be in the compiled JSON.
- **The constraint to know about:** the backlog collection/ownership layer would
  be local-only (localStorage/IndexedDB). Anything multi-user — shared trading,
  accounts — requires dropping `output: 'export'` and adding a backend. That is a
  real reversal, so it is recorded here rather than discovered later.
- If `graph.json` ever grows past a few MB, it needs chunking or a real backend.
  At ~80 characters this is far off.
