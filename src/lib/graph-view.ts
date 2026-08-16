import type { Alignment, Graph, GraphNode, NodeKind } from "@/types/graph";

export const NODE_COLORS: Record<NodeKind, string> = {
  character: "#f04a4a",
  film: "#4a8df0",
  team: "#f0b23a",
  power: "#3ec98a",
  actor: "#b06af0",
  artifact: "#e0e0e0",
};

const MIN_RADIUS = 3;
const MAX_RADIUS = 12;

/** Square-root scaling keeps hubs prominent without swamping the canvas. */
export const nodeRadius = (node: GraphNode): number =>
  Math.min(MAX_RADIUS, MIN_RADIUS + Math.sqrt(node.degree) * 1.1);

export type Adjacency = ReadonlyMap<string, ReadonlySet<string>>;

export const buildAdjacency = (graph: Graph): Adjacency => {
  const adjacency = new Map<string, Set<string>>(
    graph.nodes.map((node) => [node.id, new Set<string>()]),
  );

  for (const link of graph.links) {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  }

  return adjacency;
};

export const searchCharacters = (
  graph: Graph,
  query: string,
): readonly Extract<GraphNode, { kind: "character" }>[] => {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === "") return [];

  return graph.nodes
    .filter(
      (node): node is Extract<GraphNode, { kind: "character" }> =>
        node.kind === "character",
    )
    .filter((node) =>
      [node.label, ...node.aliases].some((value) =>
        value.toLocaleLowerCase().includes(normalized),
      ),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
};

export type TooltipRow = { readonly label: string; readonly value: string };

export type Tooltip = {
  readonly title: string;
  readonly subtitle: string | null;
  readonly rows: readonly TooltipRow[];
};

const ALIGNMENT_LABELS: Record<Alignment, string> = {
  good: "Hero",
  bad: "Villain",
  neutral: "Anti-hero",
  unknown: "Unknown",
};

const KIND_LABELS: Record<NodeKind, string> = {
  character: "Character",
  film: "Film",
  team: "Team",
  power: "Power",
  actor: "Actor",
  artifact: "Artifact",
};

const neighboursOfKind = (
  node: GraphNode,
  graph: Graph,
  kind: NodeKind,
): readonly GraphNode[] => {
  const byId = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));

  return graph.links
    .filter((link) => link.source === node.id || link.target === node.id)
    .map((link) => (link.source === node.id ? link.target : link.source))
    .map((id) => byId.get(id))
    .filter((neighbour): neighbour is GraphNode => neighbour?.kind === kind);
};

const row = (label: string, value: string): readonly TooltipRow[] =>
  value === "" ? [] : [{ label, value }];

const characterRows = (node: GraphNode, graph: Graph): readonly TooltipRow[] => {
  if (node.kind !== "character") return [];

  const teams = neighboursOfKind(node, graph, "team").map((t) => t.label);
  const powers = neighboursOfKind(node, graph, "power")
    .map((p) => p.label)
    .slice(0, 3);
  const films = neighboursOfKind(node, graph, "film").length;

  return [
    ...row("Role", node.role),
    ...row("Alignment", ALIGNMENT_LABELS[node.alignment]),
    ...row("Teams", teams.join(", ")),
    ...row("Powers", powers.join(", ")),
    ...row("Appearances", films === 0 ? "" : `${films} ${films === 1 ? "title" : "titles"}`),
  ];
};

const filmRows = (node: GraphNode, graph: Graph): readonly TooltipRow[] => {
  if (node.kind !== "film") return [];

  const characters = neighboursOfKind(node, graph, "character").length;

  return [
    ...row("Released", String(node.year)),
    ...row("Phase", String(node.phase)),
    ...row("Characters", characters === 0 ? "" : String(characters)),
  ];
};

const groupRows = (node: GraphNode, graph: Graph): readonly TooltipRow[] => {
  if (node.kind !== "team" && node.kind !== "power") return [];

  const members = neighboursOfKind(node, graph, "character").length;
  const label = node.kind === "team" ? "Members" : "Characters";

  return row(label, members === 0 ? "" : String(members));
};

const subtitleFor = (node: GraphNode): string | null => {
  if (node.kind === "character") return node.realName;
  if (node.kind === "film") return node.isSeries ? "Series" : "Film";
  return KIND_LABELS[node.kind];
};

export const tooltipFor = (node: GraphNode, graph: Graph): Tooltip => ({
  title: node.label,
  subtitle: subtitleFor(node),
  rows: [
    ...characterRows(node, graph),
    ...filmRows(node, graph),
    ...groupRows(node, graph),
  ],
});
