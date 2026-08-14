import { readFile, writeFile } from "node:fs/promises";
import { fetchSuperheroRecords } from "../../src/lib/ingest/superhero";
import type { Seed } from "../../src/types/seed";

const SEED_PATH = new URL("../../data/characters.seed.json", import.meta.url);
const OUT_PATH = new URL("../../data/raw/superhero.json", import.meta.url);

const main = async (): Promise<void> => {
  const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as Seed;

  const wantedIds = new Set(
    seed.characters
      .map((character) => character.sourceIds.superheroId)
      .filter((id): id is number => id !== null),
  );

  const records = await fetchSuperheroRecords(wantedIds);

  const unresolved = [...wantedIds].filter(
    (id) => !records.some((record) => record.id === id),
  );
  if (unresolved.length > 0) {
    throw new Error(
      `Seed references superheroIds absent upstream: ${unresolved.join(", ")}`,
    );
  }

  await writeFile(OUT_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${records.length} records for ${wantedIds.size} seeded characters to data/raw/superhero.json`,
  );
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
