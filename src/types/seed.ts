import type { Alignment, PowerStats, SourceIds } from "@/types/graph";

/** A hand-curated character in `data/characters.seed.json`. */
export type SeedCharacter = {
  readonly slug: string;
  readonly name: string;
  readonly realName: string | null;
  readonly alignment: Alignment;
  readonly role: string;
  readonly teams: readonly string[];
  /** Power slugs; hand-curated in v1 until Wikidata ingestion lands. */
  readonly powers: readonly string[];
  /** Film slugs; hand-entered in v1 until TMDB ingestion lands. */
  readonly films: readonly string[];
  readonly allies: readonly string[];
  readonly enemies: readonly string[];
  readonly sourceIds: SourceIds;
};

export type SeedFilm = {
  readonly slug: string;
  readonly title: string;
  readonly year: number;
  readonly phase: number;
  readonly isSeries: boolean;
};

export type Seed = {
  readonly characters: readonly SeedCharacter[];
  readonly films: readonly SeedFilm[];
};

/** A record from the SuperHero dataset, narrowed to the fields we consume. */
export type SuperheroRecord = {
  readonly id: number;
  readonly name: string;
  readonly powerstats: PowerStats;
  readonly aliases: readonly string[];
};
