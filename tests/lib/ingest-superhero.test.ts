import { describe, expect, it, vi } from "vitest";
import { fetchSuperheroRecords } from "@/lib/ingest/superhero";

const upstream = [
  {
    id: 346,
    name: "Iron Man",
    powerstats: {
      intelligence: 100,
      strength: 85,
      speed: 58,
      durability: 85,
      power: 100,
      combat: 64,
    },
    biography: { aliases: ["Iron Knight", "Hogan Potts"] },
  },
  {
    id: 999,
    name: "Not In Seed",
    powerstats: {
      intelligence: 1,
      strength: 1,
      speed: 1,
      durability: 1,
      power: 1,
      combat: 1,
    },
    biography: { aliases: [] },
  },
];

const mockFetch = (payload: unknown, ok = true) =>
  vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  } as Response);

describe("fetchSuperheroRecords", () => {
  it("should keep only records whose id appears in the requested set", async () => {
    const fetchFn = mockFetch(upstream);

    const records = await fetchSuperheroRecords(new Set([346]), fetchFn);

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(346);
  });

  it("should narrow each record to id, name, powerstats and aliases", async () => {
    const fetchFn = mockFetch(upstream);

    const [record] = await fetchSuperheroRecords(new Set([346]), fetchFn);

    expect(record).toEqual({
      id: 346,
      name: "Iron Man",
      powerstats: {
        intelligence: 100,
        strength: 85,
        speed: 58,
        durability: 85,
        power: 100,
        combat: 64,
      },
      aliases: ["Iron Knight", "Hogan Potts"],
    });
  });

  it("should return records sorted by id so the committed snapshot has a stable diff", async () => {
    const fetchFn = mockFetch([upstream[1], upstream[0]]);

    const records = await fetchSuperheroRecords(new Set([346, 999]), fetchFn);

    expect(records.map((r) => r.id)).toEqual([346, 999]);
  });

  it("should throw when the upstream response is not ok", async () => {
    const fetchFn = mockFetch([], false);

    await expect(fetchSuperheroRecords(new Set([346]), fetchFn)).rejects.toThrow(
      /500/,
    );
  });

  it("should default missing powerstat values to zero rather than emitting NaN", async () => {
    const fetchFn = mockFetch([
      {
        id: 1,
        name: "Partial",
        powerstats: { intelligence: 50, strength: null },
        biography: {},
      },
    ]);

    const [record] = await fetchSuperheroRecords(new Set([1]), fetchFn);

    expect(record.powerstats.intelligence).toBe(50);
    expect(record.powerstats.strength).toBe(0);
    expect(record.aliases).toEqual([]);
  });
});
