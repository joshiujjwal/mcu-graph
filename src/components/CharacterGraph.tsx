"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type {
  ForceGraphMethods,
  ForceGraphProps,
  NodeObject,
} from "react-force-graph-2d";
import {
  NODE_COLORS,
  buildAdjacency,
  nodeRadius,
  tooltipFor,
} from "@/lib/graph-view";
import type { Graph, GraphNode } from "@/types/graph";
import { GraphTooltip } from "@/components/GraphTooltip";
import { GraphLegend } from "@/components/GraphLegend";

type PositionedNode = NodeObject<GraphNode>;

type TypedForceGraph = ComponentType<
  ForceGraphProps<PositionedNode, GraphLinkObject> & {
    readonly ref?: React.RefObject<
      ForceGraphMethods<PositionedNode, GraphLinkObject> | undefined
    >;
  }
>;

type GraphLinkObject = {
  source: string | PositionedNode;
  target: string | PositionedNode;
  kind: string;
};

// force-graph reaches for `window` and canvas at import time, so it can only be
// loaded in the browser — this page is statically exported. The cast restores
// the generics that `next/dynamic` erases.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-zinc-400">Loading graph…</p>,
}) as unknown as TypedForceGraph;

const DIMMED = "rgba(120,120,130,0.12)";
const LINK_COLOR = "rgba(160,160,180,0.28)";
const LINK_ACTIVE = "rgba(255,255,255,0.75)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeToReducedMotion = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

const useContainerSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};

type Props = { readonly graph: Graph };

export const CharacterGraph = ({ graph }: Props) => {
  const graphRef = useRef<
    ForceGraphMethods<PositionedNode, GraphLinkObject> | undefined
  >(undefined);
  const { ref: containerRef, size } = useContainerSize();
  const reducedMotion = usePrefersReducedMotion();

  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const adjacency = useMemo(() => buildAdjacency(graph), [graph]);

  /** Canvas content is invisible to assistive tech, so the node list is
   *  mirrored into a focusable list that drives the same selection state. */
  const orderedNodes = useMemo(
    () => [...graph.nodes].sort((a, b) => b.degree - a.degree),
    [graph],
  );

  // force-graph mutates node/link objects in place with simulation state, so it
  // gets its own copy rather than the frozen compiled data.
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    }),
    [graph],
  );

  const isActive = useCallback(
    (id: string): boolean => {
      if (hovered === null) return true;
      return id === hovered.id || (adjacency.get(hovered.id)?.has(id) ?? false);
    },
    [adjacency, hovered],
  );

  const paintNode = useCallback(
    (node: PositionedNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const { x = 0, y = 0 } = node;
      const radius = nodeRadius(node);
      const active = isActive(node.id);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = active ? NODE_COLORS[node.kind] : DIMMED;
      ctx.fill();

      if (hovered?.id === node.id) {
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      // Labels only once zoomed in, or for the biggest hubs, otherwise
      // overlapping text makes the canvas unreadable.
      const showLabel =
        active && (scale > 1.8 || node.degree > 22 || hovered?.id === node.id);
      if (!showLabel) return;

      const fontSize = Math.max(10 / scale, 2.5);
      ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(235,235,245,0.9)";
      ctx.fillText(node.label, x, y + radius + 1);
    },
    [hovered, isActive],
  );

  const handleHover = useCallback((node: PositionedNode | null) => {
    setHovered(node ?? null);
  }, []);

  // Spread the layout out; the default charge leaves a dense unreadable ball.
  useEffect(() => {
    const instance = graphRef.current;
    if (!instance) return;

    instance.d3Force("charge")?.strength(-150);
    instance.d3Force("link")?.distance(38);
  }, [data]);

  const fitToView = useCallback(() => {
    graphRef.current?.zoomToFit(reducedMotion ? 0 : 500, 60);
  }, [reducedMotion]);

  useEffect(() => {
    if (!reducedMotion) return;
    graphRef.current?.pauseAnimation();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      onMouseMove={(event) => setPointer({ x: event.clientX, y: event.clientY })}
      className="relative h-full w-full bg-[#0b0b10]"
    >
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={size.width}
          height={size.height}
          backgroundColor="#0b0b10"
          nodeRelSize={1}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const { x = 0, y = 0 } = node;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, nodeRadius(node) + 2, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(link) => {
            const source = typeof link.source === "object" ? link.source.id : link.source;
            const target = typeof link.target === "object" ? link.target.id : link.target;
            if (hovered === null) return LINK_COLOR;
            return hovered.id === source || hovered.id === target ? LINK_ACTIVE : DIMMED;
          }}
          linkWidth={(link) => {
            const source = typeof link.source === "object" ? link.source.id : link.source;
            const target = typeof link.target === "object" ? link.target.id : link.target;
            return hovered !== null && (hovered.id === source || hovered.id === target) ? 1.5 : 0.5;
          }}
          onNodeHover={handleHover}
          onEngineStop={fitToView}
          cooldownTicks={reducedMotion ? 0 : 120}
          warmupTicks={reducedMotion ? 200 : 0}
          d3VelocityDecay={0.35}
          enableNodeDrag={!reducedMotion}
        />
      )}

      <GraphLegend />
      {hovered !== null && (
        <GraphTooltip tooltip={tooltipFor(hovered, graph)} x={pointer.x} y={pointer.y} />
      )}

      <ol
        aria-label="Graph nodes"
        className="absolute right-4 top-4 z-10 hidden max-h-[70%] w-56 overflow-y-auto rounded-md border border-white/10 bg-zinc-900/80 p-1 text-xs backdrop-blur sm:block"
      >
        {orderedNodes.map((node, index) => (
          <li key={node.id}>
            <button
              type="button"
              onFocus={(event) => {
                setFocusIndex(index);
                setHovered(node);
                // Anchor the tooltip to the focused row, not a stale pointer.
                const rect = event.currentTarget.getBoundingClientRect();
                setPointer({ x: rect.left - 280, y: rect.top });
              }}
              onBlur={() => {
                setFocusIndex((current) => (current === index ? null : current));
                setHovered((current) => (current?.id === node.id ? null : current));
              }}
              onMouseEnter={() => setHovered(node)}
              onClick={() => graphRef.current?.centerAt(undefined, undefined, 400)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-zinc-300 hover:bg-white/10 focus:bg-white/15 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${
                focusIndex === index ? "bg-white/10" : ""
              }`}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: NODE_COLORS[node.kind] }}
              />
              <span className="truncate">{node.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
