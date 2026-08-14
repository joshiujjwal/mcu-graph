import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/build-graph";
import type { CharacterNode, GraphNode } from "@/types/graph";
import type { Seed, SeedCharacter, SuperheroRecord } from "@/types/seed";

const stats = {
  intelligence: 100,
  strength: 85,
  speed: 58,
  durability: 85,
  power: 100,
  combat: 64,
};

const character = (over: Partial<SeedCharacter> = {}): SeedCharacter => ({
  slug: "iron-man",
  name: "Iron Man",
  realName: "Tony Stark",
  alignment: "good",
  role: "Armoured inventor",
  teams: [],
  powers: [],
  films: [],
  allies: [],
  enemies: [],
  sourceIds: {
    superheroId: null,
    tmdbId: null,
    marvelId: null,
    wikidataQid: null,
  },
  ...over,
});

const seedOf = (
  characters: readonly SeedCharacter[],
  films: Seed["films"] = [],
): Seed => ({ characters, films });

const film = {
  slug: "iron-man",
  title: "Iron Man",
  year: 2008,
  phase: 1,
  isSeries: false,
};

const byId = (nodes: readonly GraphNode[], id: string) =>
  nodes.find((node) => node.id === id);

describe("buildGraph", () => {
  it("should emit one character node per seeded character", () => {
    const graph = buildGraph(seedOf([character()]), []);

    const node = byId(graph.nodes, "character:iron-man") as CharacterNode;
    expect(node.kind).toBe("character");
    expect(node.label).toBe("Iron Man");
    expect(node.realName).toBe("Tony Stark");
  });

  it("should attach powerstats by superheroId rather than by name", () => {
    const seed = seedOf([
      character({
        sourceIds: {
          superheroId: 346,
          tmdbId: null,
          marvelId: null,
          wikidataQid: null,
        },
      }),
    ]);
    // Deliberately mismatched name: the join must key on id alone.
    const records: SuperheroRecord[] = [
      { id: 346, name: "Totally Different Name", powerstats: stats, aliases: ["Shellhead"] },
    ];

    const node = byId(buildGraph(seed, records).nodes, "character:iron-man") as CharacterNode;

    expect(node.powerStats).toEqual(stats);
    expect(node.aliases).toEqual(["Shellhead"]);
    expect(node.label).toBe("Iron Man");
  });

  it("should leave powerStats null when the character has no superheroId", () => {
    const node = byId(
      buildGraph(seedOf([character()]), []).nodes,
      "character:iron-man",
    ) as CharacterNode;

    expect(node.powerStats).toBeNull();
    expect(node.aliases).toEqual([]);
  });

  it("should leave powerStats null when the superheroId has no matching record", () => {
    const seed = seedOf([
      character({
        sourceIds: {
          superheroId: 12345,
          tmdbId: null,
          marvelId: null,
          wikidataQid: null,
        },
      }),
    ]);

    const node = byId(
      buildGraph(seed, []).nodes,
      "character:iron-man",
    ) as CharacterNode;

    expect(node.powerStats).toBeNull();
  });

  it("should create film nodes and APPEARS_IN links only for seeded films", () => {
    const seed = seedOf([character({ films: ["iron-man"] })], [film]);

    const graph = buildGraph(seed, []);

    expect(byId(graph.nodes, "film:iron-man")?.kind).toBe("film");
    expect(graph.links).toContainEqual({
      source: "character:iron-man",
      target: "film:iron-man",
      kind: "APPEARS_IN",
    });
  });

  it("should ignore a film reference that is not declared in the seed film list", () => {
    const seed = seedOf([character({ films: ["ghost-film"] })], [film]);

    const graph = buildGraph(seed, []);

    expect(byId(graph.nodes, "film:ghost-film")).toBeUndefined();
    expect(graph.links).toHaveLength(0);
  });

  it("should derive team and power nodes from character references and dedupe them", () => {
    const seed = seedOf([
      character({ slug: "a", name: "A", teams: ["avengers"], powers: ["flight"] }),
      character({ slug: "b", name: "B", teams: ["avengers"], powers: ["flight"] }),
    ]);

    const graph = buildGraph(seed, []);

    expect(graph.nodes.filter((n) => n.kind === "team")).toHaveLength(1);
    expect(graph.nodes.filter((n) => n.kind === "power")).toHaveLength(1);
    expect(graph.links.filter((l) => l.kind === "MEMBER_OF")).toHaveLength(2);
    expect(graph.links.filter((l) => l.kind === "HAS_POWER")).toHaveLength(2);
  });

  it("should humanise derived team and power labels", () => {
    const seed = seedOf([
      character({ teams: ["guardians-of-the-galaxy"], powers: ["energy-blasts"] }),
    ]);

    const graph = buildGraph(seed, []);

    expect(byId(graph.nodes, "team:guardians-of-the-galaxy")?.label).toBe(
      "Guardians Of The Galaxy",
    );
    expect(byId(graph.nodes, "power:energy-blasts")?.label).toBe("Energy Blasts");
  });

  it("should emit a single undirected ALLY_OF link for a mutual alliance", () => {
    const seed = seedOf([
      character({ slug: "a", name: "A", allies: ["b"] }),
      character({ slug: "b", name: "B", allies: ["a"] }),
    ]);

    const allyLinks = buildGraph(seed, []).links.filter(
      (link) => link.kind === "ALLY_OF",
    );

    expect(allyLinks).toHaveLength(1);
  });

  it("should emit a single undirected ENEMY_OF link for a mutual enmity", () => {
    const seed = seedOf([
      character({ slug: "a", name: "A", enemies: ["b"] }),
      character({ slug: "b", name: "B", enemies: ["a"] }),
    ]);

    const enemyLinks = buildGraph(seed, []).links.filter(
      (link) => link.kind === "ENEMY_OF",
    );

    expect(enemyLinks).toHaveLength(1);
  });

  it("should drop relationship links pointing at characters absent from the seed", () => {
    const seed = seedOf([character({ allies: ["nonexistent"], enemies: ["also-missing"] })]);

    expect(buildGraph(seed, []).links).toHaveLength(0);
  });

  it("should never link a character to itself", () => {
    const seed = seedOf([character({ slug: "a", name: "A", allies: ["a"] })]);

    expect(buildGraph(seed, []).links).toHaveLength(0);
  });

  it("should compute degree as the number of incident links", () => {
    const seed = seedOf(
      [character({ teams: ["avengers"], powers: ["flight"], films: ["iron-man"] })],
      [film],
    );

    const graph = buildGraph(seed, []);

    expect(byId(graph.nodes, "character:iron-man")?.degree).toBe(3);
    expect(byId(graph.nodes, "team:avengers")?.degree).toBe(1);
    expect(byId(graph.nodes, "film:iron-man")?.degree).toBe(1);
  });

  it("should prune orphan film nodes that no character appears in", () => {
    const graph = buildGraph(seedOf([character()], [film]), []);

    expect(byId(graph.nodes, "film:iron-man")).toBeUndefined();
  });

  it("should keep a character node even when it has no links at all", () => {
    const graph = buildGraph(seedOf([character()]), []);

    expect(graph.nodes).toHaveLength(1);
    expect(byId(graph.nodes, "character:iron-man")?.degree).toBe(0);
  });

  it("should carry film metadata onto the film node", () => {
    const seed = seedOf([character({ films: ["iron-man"] })], [film]);

    const node = buildGraph(seed, []).nodes.find((n) => n.kind === "film");

    expect(node).toMatchObject({ label: "Iron Man", year: 2008, phase: 1, isSeries: false });
  });

  it("should produce links whose endpoints all exist as nodes", () => {
    const seed = seedOf(
      [
        character({ slug: "a", name: "A", teams: ["avengers"], films: ["iron-man"], allies: ["b"] }),
        character({ slug: "b", name: "B", powers: ["flight"], allies: ["a"] }),
      ],
      [film],
    );

    const graph = buildGraph(seed, []);
    const ids = new Set(graph.nodes.map((node) => node.id));

    for (const link of graph.links) {
      expect(ids.has(link.source)).toBe(true);
      expect(ids.has(link.target)).toBe(true);
    }
  });

  it("should be deterministic across runs", () => {
    const seed = seedOf(
      [character({ teams: ["avengers"], powers: ["flight"], films: ["iron-man"] })],
      [film],
    );

    expect(buildGraph(seed, [])).toEqual(buildGraph(seed, []));
  });
});
