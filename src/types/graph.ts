/**
 * Graph domain model.
 *
 * `Actor` / `Artifact` node kinds and the `PORTRAYED_BY` / `WIELDS` /
 * `RELATED_TO` edge kinds are reserved for backlog data sources (TMDB, Marvel
 * API, Wikidata). They are declared now so adding a source later is a new
 * adapter and a new join rather than a change to the compiled shape.
 */

export const NODE_KINDS = [
  "character",
  "film",
  "team",
  "power",
  "actor",
  "artifact",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = [
  "APPEARS_IN",
  "MEMBER_OF",
  "HAS_POWER",
  "ALLY_OF",
  "ENEMY_OF",
  "PORTRAYED_BY",
  "WIELDS",
  "RELATED_TO",
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

export type Alignment = "good" | "bad" | "neutral" | "unknown";

/** Cross-source foreign keys. Only `superheroId` is populated in v1. */
export type SourceIds = {
  readonly superheroId: number | null;
  readonly tmdbId: number | null;
  readonly marvelId: number | null;
  readonly wikidataQid: string | null;
};

/** Comics powerstats, 0-100. Not MCU canon — label as such in any UI. */
export type PowerStats = {
  readonly intelligence: number;
  readonly strength: number;
  readonly speed: number;
  readonly durability: number;
  readonly power: number;
  readonly combat: number;
};

type BaseNode = {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
  /** Number of incident edges, computed by the compiler; drives node radius. */
  readonly degree: number;
};

export type CharacterNode = BaseNode & {
  readonly kind: "character";
  readonly realName: string | null;
  readonly alignment: Alignment;
  /** One-line role description, shown in the tooltip. */
  readonly role: string;
  readonly aliases: readonly string[];
  readonly powerStats: PowerStats | null;
  readonly sourceIds: SourceIds;
};

export type FilmNode = BaseNode & {
  readonly kind: "film";
  readonly year: number;
  readonly phase: number;
  readonly isSeries: boolean;
};

export type TeamNode = BaseNode & { readonly kind: "team" };

export type PowerNode = BaseNode & { readonly kind: "power" };

export type ActorNode = BaseNode & { readonly kind: "actor" };

export type ArtifactNode = BaseNode & { readonly kind: "artifact" };

export type GraphNode =
  | CharacterNode
  | FilmNode
  | TeamNode
  | PowerNode
  | ActorNode
  | ArtifactNode;

export type GraphLink = {
  readonly source: string;
  readonly target: string;
  readonly kind: EdgeKind;
};

export type Graph = {
  readonly nodes: readonly GraphNode[];
  readonly links: readonly GraphLink[];
};

export const isCharacterNode = (node: GraphNode): node is CharacterNode =>
  node.kind === "character";
