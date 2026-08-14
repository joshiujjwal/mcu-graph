"use client";

import { useEffect, useState } from "react";
import { CharacterGraph } from "@/components/CharacterGraph";
import type { Graph } from "@/types/graph";

type State =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly graph: Graph }
  | { readonly status: "error"; readonly message: string };

export const GraphLoader = ({ src }: { readonly src: string }) => {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        setState({ status: "ready", graph: (await response.json()) as Graph });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    void load();
    return () => controller.abort();
  }, [src]);

  if (state.status === "loading") {
    return (
      <p className="p-6 text-sm text-zinc-400" role="status">
        Loading the MCU graph…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="p-6 text-sm text-red-400" role="alert">
        <p>Could not load the graph: {state.message}</p>
        <p className="mt-1 text-zinc-500">
          Run <code className="font-mono">npm run build:graph</code> to regenerate it.
        </p>
      </div>
    );
  }

  return <CharacterGraph graph={state.graph} />;
};
