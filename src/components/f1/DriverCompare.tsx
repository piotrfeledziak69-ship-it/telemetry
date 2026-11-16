import { useState } from "react";
import type { DriverTileProfile } from "@/components/f1/DriverProfileTiles";
import type { SeasonSummary } from "@/lib/f1-stats";

type Row = { label: string; get: (s: SeasonSummary, d: DriverTileProfile) => number | null; lower?: boolean; digits?: number };

const ROWS: Row[] = [
  { label: "Championship", get: (s) => s.championshipPos, lower: true, digits: 0 },
  { label: "Titles", get: (_, d) => d.titles ?? null, digits: 0 },
  { label: "Points", get: (s) => s.totalPoints, digits: 0 },
  { label: "Points / start", get: (s) => s.avgPoints },
  { label: "Wins", get: (s) => s.wins, digits: 0 },
  { label: "Sprint wins", get: (s) => s.sprintWins, digits: 0 },
  { label: "Podiums", get: (s) => s.podiums, digits: 0 },
  { label: "Poles", get: (s) => s.poles, digits: 0 },
  { label: "Fastest laps", get: (s) => s.fastestLaps, digits: 0 },
  { label: "Points finishes", get: (s) => s.pointsFinishes, digits: 0 },
  { label: "Best finish", get: (s) => s.bestFinish, lower: true, digits: 0 },
  { label: "Avg finish", get: (s) => s.avgFinish, lower: true },
  { label: "Avg grid", get: (s) => s.avgGrid, lower: true },
  { label: "Avg qualifying", get: (s) => s.avgQuali, lower: true },
  { label: "Q3 appearances", get: (s) => s.q3Apps, digits: 0 },
  { label: "Positions gained", get: (s) => s.positionsGained, digits: 0 },
  { label: "DNFs", get: (s) => s.dnfs, lower: true, digits: 0 },
  { label: "Finish rate %", get: (s) => s.finishRate },
  { label: "Starts", get: (s) => s.starts, digits: 0 },
  { label: "Laps", get: (s) => s.lapsCompleted, digits: 0 },
];

export function DriverCompare({ drivers }: { drivers: DriverTileProfile[] }) {
  const names = [...drivers].map((d) => d.name).sort((a, b) => a.localeCompare(b));
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const da = drivers.find((d) => d.name === a);
  const db = drivers.find((d) => d.name === b);
  const pick = (value: string, set: (v: string) => void, label: string) => (
    <select
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm font-semibold text-foreground"
    >
      <option value="">Pick driver…</option>
      {names.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
  return (
    <div className="mt-3 border-t border-border/70 px-2 pb-3 pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Compare two drivers
      </p>
      <div className="flex items-center gap-2">
        {pick(a, setA, "First driver")}
        <span className="text-xs font-black text-muted-foreground">VS</span>
        {pick(b, setB, "Second driver")}
      </div>
      {da && db && (
        <table className="mt-3 w-full table-fixed text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              <th className="truncate text-left font-bold">{da.name}<div className="font-normal">{da.team}</div></th>
              <th className="w-28" />
              <th className="truncate text-right font-bold">{db.name}<div className="font-normal">{db.team}</div></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const va = r.get(da.stats, da);
              const vb = r.get(db.stats, db);
              const better = va == null || vb == null || va === vb ? 0 : (r.lower ? va < vb : va > vb) ? -1 : 1;
              const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(r.digits ?? 1));
              return (
                <tr key={r.label} className="border-t border-border/40">
                  <td className={`py-1.5 font-mono tabular-nums ${better === -1 ? "font-black text-primary" : ""}`}>{fmt(va)}</td>
                  <td className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.label}</td>
                  <td className={`py-1.5 text-right font-mono tabular-nums ${better === 1 ? "font-black text-primary" : ""}`}>{fmt(vb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
