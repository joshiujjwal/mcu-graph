import type {
  CharacterNode,
  FilmNode,
  Graph,
  GraphLink,
  GraphNode,
  PowerNode,
  TeamNode,
} from "@/types/graph";
import type { Seed, SeedCharacter, SuperheroRecord } from "@/types/seed";

const characterId = (slug: string) => `character:${slug}`;
const filmId = (slug: string) => `film:${slug}`;
const teamId = (slug: string) => `team:${slug}`;
const powerId = (slug: string) => `power:${slug}`;

const humanise = (slug: string): string =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Mutual relationships appear in both characters' seed entries. Keying an
 * undirected edge on its sorted endpoints collapses those into one link.
 */
const undirectedKey = (a: string, b: string): string =>
  [a, b].sort().join("|");

const buildLinks = (
  seed: Seed,
  knownFilms: ReadonlySet<string>,
  knownCharacters: ReadonlySet<string>,
): readonly GraphLink[] => {
  const links: GraphLink[] = [];
  const seenUndirected = new Set<string>();

  const addUndirected = (
    from: string,
    toSlug: string,
    kind: GraphLink["kind"],
  ): void => {
    if (!knownCharacters.has(toSlug)) return;
    const target = characterId(toSlug);
    if (target === from) return;

    const key = `${kind}:${undirectedKey(from, target)}`;
    if (seenUndirected.has(key)) return;

    seenUndirected.add(key);
    links.push({ source: from, target, kind });
  };

  for (const character of seed.characters) {
    const source = characterId(character.slug);

    for (const slug of character.films) {
      if (!knownFilms.has(slug)) continue;
      links.push({ source, target: filmId(slug), kind: "APPEARS_IN" });
    }
    for (const slug of character.teams) {
      links.push({ source, target: teamId(slug), kind: "MEMBER_OF" });
    }
    for (const slug of character.powers) {
      links.push({ source, target: powerId(slug), kind: "HAS_POWER" });
    }
    for (const slug of character.allies) {
      addUndirected(source, slug, "ALLY_OF");
    }
    for (const slug of character.enemies) {
      addUndirected(source, slug, "ENEMY_OF");
    }
  }

  return links;
};

const collectSlugs = (
  characters: readonly SeedCharacter[],
  select: (character: SeedCharacter) => readonly string[],
): readonly string[] => [
  ...new Set(characters.flatMap((character) => select(character))),
];

/**
 * Compiles the curated seed plus external source records into the rendered
 * graph. Pure by design: no fetching, no filesystem access, fully deterministic.
 */
export const buildGraph = (
  seed: Seed,
  superheroRecords: readonly SuperheroRecord[],
): Graph => {
  const statsById = new Map(
    superheroRecords.map((record) => [record.id, record]),
  );
  const knownCharacters = new Set(seed.characters.map((c) => c.slug));
  const knownFilms = new Set(seed.films.map((f) => f.slug));

  const links = buildLinks(seed, knownFilms, knownCharacters);

  const degrees = new Map<string, number>();
  for (const link of links) {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
  }
  const degreeOf = (id: string) => degrees.get(id) ?? 0;

  const characterNodes: CharacterNode[] = seed.characters.map((character) => {
    const { superheroId } = character.sourceIds;
    const record = superheroId === null ? undefined : statsById.get(superheroId);

    return {
      id: characterId(character.slug),
      kind: "character",
      label: character.name,
      degree: degreeOf(characterId(character.slug)),
      realName: character.realName,
      alignment: character.alignment,
      role: character.role,
      aliases: record?.aliases ?? [],
      powerStats: record?.powerstats ?? null,
      sourceIds: character.sourceIds,
    };
  });

  // Derived nodes exist only where a character actually references them, so
  // orphans never reach the canvas.
  const filmNodes: FilmNode[] = seed.films
    .filter((film) => degreeOf(filmId(film.slug)) > 0)
    .map((film) => ({
      id: filmId(film.slug),
      kind: "film",
      label: film.title,
      degree: degreeOf(filmId(film.slug)),
      year: film.year,
      phase: film.phase,
      isSeries: film.isSeries,
    }));

  const teamNodes: TeamNode[] = collectSlugs(
    seed.characters,
    (character) => character.teams,
  ).map((slug) => ({
    id: teamId(slug),
    kind: "team",
    label: humanise(slug),
    degree: degreeOf(teamId(slug)),
  }));

  const powerNodes: PowerNode[] = collectSlugs(
    seed.characters,
    (character) => character.powers,
  ).map((slug) => ({
    id: powerId(slug),
    kind: "power",
    label: humanise(slug),
    degree: degreeOf(powerId(slug)),
  }));

  const nodes: readonly GraphNode[] = [
    ...characterNodes,
    ...filmNodes,
    ...teamNodes,
    ...powerNodes,
  ];

  return { nodes, links };
};
