import type { PowerStats } from "@/types/graph";
import type { SuperheroRecord } from "@/types/seed";

export const SUPERHERO_DATASET_URL =
  "https://akabab.github.io/superhero-api/api/all.json";

export type FetchFn = (url: string) => Promise<Response>;

const STAT_KEYS = [
  "intelligence",
  "strength",
  "speed",
  "durability",
  "power",
  "combat",
] as const satisfies readonly (keyof PowerStats)[];

/** Upstream sends `null` for unknown stats; coerce those to 0, never NaN. */
const toStat = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const toPowerStats = (raw: unknown): PowerStats => {
  const source = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    STAT_KEYS.map((key) => [key, toStat(source[key])]),
  ) as unknown as PowerStats;
};

const toRecord = (raw: Record<string, unknown>): SuperheroRecord => {
  const biography = (raw.biography ?? {}) as Record<string, unknown>;
  const aliases = Array.isArray(biography.aliases)
    ? biography.aliases.filter((alias): alias is string => typeof alias === "string")
    : [];

  return {
    id: raw.id as number,
    name: String(raw.name),
    powerstats: toPowerStats(raw.powerstats),
    aliases,
  };
};

/**
 * Fetches the SuperHero dataset and narrows it to the characters in `wantedIds`.
 * Sorted by id so the committed snapshot produces a stable diff.
 */
export const fetchSuperheroRecords = async (
  wantedIds: ReadonlySet<number>,
  fetchFn: FetchFn = fetch,
): Promise<readonly SuperheroRecord[]> => {
  const response = await fetchFn(SUPERHERO_DATASET_URL);
  if (!response.ok) {
    throw new Error(
      `SuperHero dataset request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as Record<string, unknown>[];

  return payload
    .filter((raw) => wantedIds.has(raw.id as number))
    .map(toRecord)
    .sort((a, b) => a.id - b.id);
};
