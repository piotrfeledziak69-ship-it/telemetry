import collection from "@/data/racing-lines.json";
import { trackSlug } from "./f1-shell";
import type { Point } from "./quali-simulation";

export type RacingLineCollection = { version: 1; tracks: Record<string, Point[]> };

export function validRacingLine(value: unknown): value is Point[] {
  return Array.isArray(value) && value.length >= 3 && value.every((point) =>
    point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
}

/** Published site data only: device-local lines can never override this collection. */
export function sharedRacingLine(track: string, source: unknown = collection): Point[] {
  if (!source || typeof source !== "object" || !("tracks" in source)) return [];
  const tracks = source.tracks;
  if (!tracks || typeof tracks !== "object") return [];
  const points = (tracks as Record<string, unknown>)[trackSlug(track)];
  return validRacingLine(points) ? points.map((point) => ({ ...point })) : [];
}

/**
 * One resolver for Quali Simulation and ERS: the shared site collection wins,
 * then a device-saved line (only for tracks not yet published), then the fallback.
 */
export function resolveRacingLine(
  track: string,
  storage: Pick<Storage, "getItem"> | null,
  fallback: Point[] = [],
  source: unknown = collection,
): Point[] {
  const shared = sharedRacingLine(track, source);
  if (shared.length) return shared;
  try {
    const saved: unknown = JSON.parse(storage?.getItem(`f1.quali.line.v1.${trackSlug(track)}`) ?? "null");
    if (validRacingLine(saved)) return saved;
  } catch { /* corrupt device entry */ }
  return fallback;
}

/** Read-only migration export. No upload or publication endpoint exists in the app. */
export function exportDeviceRacingLines(storage: Pick<Storage, "length" | "key" | "getItem">): RacingLineCollection {
  const tracks: Record<string, Point[]> = {};
  const prefix = "f1.quali.line.v1.";
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const points: unknown = JSON.parse(storage.getItem(key) ?? "null");
      if (validRacingLine(points)) tracks[trackSlug(key.slice(prefix.length))] = points;
    } catch { /* Preserve other lines when one old entry is corrupt. */ }
  }
  return { version: 1, tracks };
}