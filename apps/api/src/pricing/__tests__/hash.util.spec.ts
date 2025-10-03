import { canonicalizeForHash, computeStableHash, toCanonicalJson } from "../hash.util";

describe("hash.util", () => {
  const orgId = "11111111-2222-3333-4444-555555555555";
  const version = "2025-09-01+1.0.0";

  it("produces identical hashes regardless of key ordering", () => {
    const payloadA = {
      process: "CNC_MILLING",
      material_code: "AL6061",
      quantity: 25,
      tolerances: ["ISO7", "ISO6"],
      finishes: ["Anodize", "Powder"],
      leadtime_profile: "Express",
      ship_to_region: "NA",
      geometry: {
        features: {
          holes: 10,
          slots: 2,
        },
      },
    };

    const payloadB = {
      ship_to_region: "na",
      finishes: ["powder", "ANODIZE"],
      leadtime_profile: "express",
      tolerances: ["iso6", "iso7"],
      quantity: 25,
      material_code: "al6061",
      process: "cnc_milling",
      geometry: {
        features: {
          slots: 2,
          holes: 10,
        },
      },
    };

    const hashA = computeStableHash(orgId, version, payloadA);
    const hashB = computeStableHash(orgId, version, payloadB);

    expect(hashA.canonicalJson).toEqual(hashB.canonicalJson);
    expect(hashA.sha256Hex).toEqual(hashB.sha256Hex);
    expect(hashA.redisKey).toEqual(hashB.redisKey);
    expect(hashA.base32).toHaveLength(12);
  });

  it("changes hash when numeric input differs", () => {
    const basePayload = {
      process: "cnc_turning",
      material_code: "steel1018",
      quantity: 10,
      finishes: ["black_oxide"],
      leadtime_profile: "standard",
    };

    const hash1 = computeStableHash(orgId, version, basePayload);
    const hash2 = computeStableHash(orgId, version, { ...basePayload, quantity: 11 });

    expect(hash1.sha256Hex).not.toEqual(hash2.sha256Hex);
    expect(hash1.redisKey).not.toEqual(hash2.redisKey);
  });

  it("rounds floating point noise to six decimals", () => {
    const payload = {
      process: "cnc_milling",
      material_code: "al6061",
      features: {
        volume_cc: 12.12345678,
      },
    };

    const canonical = canonicalizeForHash(payload);
    const json = JSON.parse(JSON.stringify(canonical)) as Record<string, unknown>;
    const features = json.features as Record<string, unknown>;

    expect(features.volume_cc).toBe(12.123457);
  });

  it("drops nullish properties from canonical json", () => {
    const payload = {
      process: "cnc_milling",
      material_code: "al6061",
      optional: null,
      nested: {
        skip: undefined,
        keep: "value",
      },
    };

    const canonicalJson = toCanonicalJson(payload);

    expect(canonicalJson).toBe('{"material_code":"al6061","nested":{"keep":"value"},"process":"cnc_milling"}');
    expect(canonicalJson.includes("optional")).toBe(false);
    expect(canonicalJson.includes("skip")).toBe(false);
  });
});