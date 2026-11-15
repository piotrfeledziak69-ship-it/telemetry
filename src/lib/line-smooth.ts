import type { Point } from "@/lib/quali-simulation";

/** Smooths a closed racing line with a few Gaussian passes; keeps point count and start/finish point. */
export function smoothRacingLine(points: Point[], passes = 3): Point[] {
  const n = points.length;
  if (n < 5) return points.map((p) => ({ ...p }));
  const w = [1, 4, 6, 4, 1];
  let cur = points.map((p) => ({ ...p }));
  for (let k = 0; k < passes; k++) {
    cur = cur.map((_, i) => {
      let x = 0, y = 0;
      for (let j = -2; j <= 2; j++) {
        const p = cur[(i + j + n) % n];
        x += p.x * w[j + 2]; y += p.y * w[j + 2];
      }
      return { ...cur[i], x: x / 16, y: y / 16 };
    });
  }
  cur[0] = { ...points[0] };
  return cur;
}
