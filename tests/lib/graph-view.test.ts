import { describe, expect, it } from "vitest";
import {
  NODE_COLORS,
  buildAdjacency,
  nodeRadius,
  tooltipFor,
} from "@/lib/graph-view";
import type { CharacterNode, Graph, GraphNode } from "@/types/graph";

const characterNode = (over: Partial<CharacterNode> = {}): CharacterNode => ({
  id: "character:iron-man",
  kind: "character",
  label: "Iron Man",
  degree: 4,
  realName: "Tony Stark",
  alignment: "good",
  role: "Armoured inventor",
  aliases: [],
  powerStats: null,
  sourceIds: {
    superheroId: null,
    tmdbId: null,
    marvelId: null,
    wikidataQid: null,
  },
  ...over,
});

const graph: Graph = {
  nodes: [
    characterNode(),
    characterNode({ id: "character:thor", label: "Thor" }),
    { id: "team:avengers", kind: "team", label: "Avengers", degree: 2 },
  ],
  links: [
    { source: "character:iron-man", target: "team:avengers", kind: "MEMBER_OF" },
    { source: "character:thor", target: "team:avengers", kind: "MEMBER_OF" },
  ],
};

describe("buildAdjacency", () => {
  it("should map each node to its directly connected neighbours", () => {
    const adjacency = buildAdjacency(graph);

    expect(adjacency.get("character:iron-man")).toEqual(
      new Set(["team:avengers"]),
    );
    expect(adjacency.get("team:avengers")).toEqual(
      new Set(["character:iron-man", "character:thor"]),
    );
  });

  it("should treat links as undirected so neighbours resolve from either end", () => {
    const adjacency = buildAdjacency(graph);

    expect(adjacency.get("character:thor")?.has("team:avengers")).toBe(true);
    expect(adjacency.get("team:avengers")?.has("character:thor")).toBe(true);
  });

  it("should give an isolated node an empty neighbour set rather than undefined", () => {
    const adjacency = buildAdjacency({
      nodes: [characterNode({ id: "character:lonely", degree: 0 })],
      links: [],
    });

    expect(adjacency.get("character:lonely")).toEqual(new Set());
  });
});

describe("nodeRadius", () => {
  it("should grow with degree", () => {
    const small = nodeRadius(characterNode({ degree: 1 }));
    const large = nodeRadius(characterNode({ degree: 20 }));

    expect(large).toBeGreaterThan(small);
  });

  it("should stay within readable bounds even at extreme degree", () => {
    const radius = nodeRadius(characterNode({ degree: 5000 }));

    expect(radius).toBeLessThanOrEqual(12);
  });

  it("should give a zero-degree node a visible radius", () => {
    expect(nodeRadius(characterNode({ degree: 0 }))).toBeGreaterThan(0);
  });
});

describe("NODE_COLORS", () => {
  it("should define a distinct colour for every node kind in use", () => {
    const kinds: GraphNode["kind"][] = [
      "character",
      "film",
      "team",
      "power",
      "actor",
      "artifact",
    ];

    for (const kind of kinds) {
      expect(NODE_COLORS[kind]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("tooltipFor", () => {
  it("should list name, role, alignment, teams, powers and film count for a character", () => {
    const tooltip = tooltipFor(characterNode(), graph);

    expect(tooltip.title).toBe("Iron Man");
    expect(tooltip.subtitle).toBe("Tony Stark");
    expect(tooltip.rows).toContainEqual({ label: "Role", value: "Armoured inventor" });
    expect(tooltip.rows).toContainEqual({ label: "Alignment", value: "Hero" });
    expect(tooltip.rows).toContainEqual({ label: "Teams", value: "Avengers" });
  });

  it("should show at most three powers", () => {
    const withPowers: Graph = {
      nodes: [
        characterNode(),
        { id: "power:a", kind: "power", label: "A", degree: 1 },
        { id: "power:b", kind: "power", label: "B", degree: 1 },
        { id: "power:c", kind: "power", label: "C", degree: 1 },
        { id: "power:d", kind: "power", label: "D", degree: 1 },
      ],
      links: ["a", "b", "c", "d"].map((p) => ({
        source: "character:iron-man",
        target: `power:${p}`,
        kind: "HAS_POWER" as const,
      })),
    };

    const powers = tooltipFor(characterNode(), withPowers).rows.find(
      (row) => row.label === "Powers",
    );

    expect(powers?.value).toBe("A, B, C");
  });

  it("should report the number of film appearances", () => {    const withFilms: Graph = {
      nodes: [
        characterNode(),
        { id: "film:x", kind: "film", label: "X", degree: 1, year: 2008, phase: 1, isSeries: false },
        { id: "film:y", kind: "film", label: "Y", degree: 1, year: 2010, phase: 1, isSeries: false },
      ],
      links: [
        { source: "character:iron-man", target: "film:x", kind: "APPEARS_IN" },
        { source: "character:iron-man", target: "film:y", kind: "APPEARS_IN" },
      ],
    };

    const films = tooltipFor(characterNode(), withFilms).rows.find(
      (row) => row.label === "Appearances",
    );

    expect(films?.value).toBe("2 titles");
  });

  it("should use the singular form for a single appearance", () => {
    const single: Graph = {
      nodes: [
        characterNode(),
        { id: "film:x", kind: "film", label: "X", degree: 1, year: 2008, phase: 1, isSeries: false },
      ],
      links: [{ source: "character:iron-man", target: "film:x", kind: "APPEARS_IN" }],
    };

    const films = tooltipFor(characterNode(), single).rows.find(
      (row) => row.label === "Appearances",
    );

    expect(films?.value).toBe("1 title");
  });

  it("should omit rows that have no data instead of showing empty values", () => {
    const isolated = characterNode({ id: "character:solo", role: "" });
    const tooltip = tooltipFor(isolated, { nodes: [isolated], links: [] });

    expect(tooltip.rows.some((row) => row.value === "")).toBe(false);
    expect(tooltip.rows.some((row) => row.label === "Teams")).toBe(false);
  });

  it("should describe a film node with its year and kind", () => {
    const filmNode: GraphNode = {
      id: "film:iron-man",
      kind: "film",
      label: "Iron Man",
      degree: 3,
      year: 2008,
      phase: 1,
      isSeries: false,
    };

    const tooltip = tooltipFor(filmNode, { nodes: [filmNode], links: [] });

    expect(tooltip.title).toBe("Iron Man");
    expect(tooltip.rows).toContainEqual({ label: "Released", value: "2008" });
    expect(tooltip.rows).toContainEqual({ label: "Phase", value: "1" });
  });

  it("should label a series distinctly from a film", () => {
    const series: GraphNode = {
      id: "film:loki",
      kind: "film",
      label: "Loki",
      degree: 1,
      year: 2021,
      phase: 4,
      isSeries: true,
    };

    expect(tooltipFor(series, { nodes: [series], links: [] }).subtitle).toBe("Series");
  });

  it("should report how many characters a team or power connects", () => {
    const team = graph.nodes[2];

    const tooltip = tooltipFor(team, graph);

    expect(tooltip.subtitle).toBe("Team");
    expect(tooltip.rows).toContainEqual({ label: "Members", value: "2" });
  });
});
