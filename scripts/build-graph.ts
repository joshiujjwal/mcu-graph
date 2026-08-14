import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildGraph } from "../src/lib/build-graph";
import type { Seed, SuperheroRecord } from "../src/types/seed";

const SEED_PATH = new URL("../data/characters.seed.json", import.meta.url);
const SUPERHERO_PATH = new URL("../data/raw/superhero.json", import.meta.url);
const OUT_DIR = new URL("../public/data/", import.meta.url);
const OUT_PATH = new URL("../public/data/graph.json", import.meta.url);

const readJson = async <T>(path: URL): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

const main = async (): Promise<void> => {
  const [seed, superheroRecords] = await Promise.all([
    readJson<Seed>(SEED_PATH),
    readJson<readonly SuperheroRecord[]>(SUPERHERO_PATH),
  ]);

  const graph = buildGraph(seed, superheroRecords);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(graph)}\n`, "utf8");

  const counts = graph.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.kind] = (acc[node.kind] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `Built graph: ${graph.nodes.length} nodes (${Object.entries(counts)
      .map(([kind, count]) => `${count} ${kind}`)
      .join(", ")}), ${graph.links.length} links`,
  );
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
