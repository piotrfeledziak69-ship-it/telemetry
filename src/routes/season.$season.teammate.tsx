import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SUPABASE_URL, SUPABASE_ANON_KEY, titleCaseTrack } from "@/lib/f1-shell";
import { ShellHeader, ShellPage } from "@/components/f1/ShellHeader";

export const Route = createFileRoute("/season/$season/teammate")({
  component: TeammatePage,
});

type FullSession = {
  id: string;
  season: number;
  driver_name?: string;
  track_name: string;
  category: string;
  starting_pos?: number | null;
  finishing_pos?: number | null;
  results?: { name: string; position: any; best_lap?: string }[];
  session_date?: string;
};
type Team = { driver_name: string; team: string };

async function sbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return res.json();
}

const RACE_POINTS = [0, 25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [0, 8, 7, 6, 5, 4, 3, 2, 1];

function TeammatePage() {
  const { season } = Route.useParams();
  const seasonN = Number(season);
  const [sessions, setSessions] = useState<FullSession[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      sbFetch<FullSession[]>(
        `telemetry_sessions?select=id,season,driver_name,track_name,category,starting_pos,finishing_pos,results,session_date&season=eq.${seasonN}&order=session_date.asc`,
      ),
      sbFetch<Team[]>(`driver_teams?select=driver_name,team&season=eq.${seasonN}`),
    ])
      .then(([s, t]) => {
        if (cancelled) return;
        setSessions(s || []);
        setTeams(t || []);
      })
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [seasonN]);

  const teamMap = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach((t) => (m[String(t.driver_name).toUpperCase()] = t.team));
    return m;
  }, [teams]);

  // Player driver: most frequent driver_name across sessions this season
  const playerDriver = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const n = String(s.driver_name || "").toUpperCase();
      if (n) counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [sessions]);

  const playerTeam = playerDriver ? teamMap[playerDriver] : null;
  const teammate = useMemo(() => {
    if (!playerTeam) return null;
    const mates = Object.entries(teamMap)
      .filter(([name, team]) => team === playerTeam && name !== playerDriver)
      .map(([n]) => n);
    return mates[0] || null;
  }, [teamMap, playerTeam, playerDriver]);

  const rows = useMemo(() => {
    if (!playerDriver || !teammate) return [];
    const perWeekend: Record<string, {
      track: string;
      raceP?: any; raceT?: any;
      qualiP?: any; qualiT?: any;
      sprintP?: any; sprintT?: any;
    }> = {};
    sessions.forEach((s) => {
      const track = s.track_name || "?";
      perWeekend[track] = perWeekend[track] || { track };
      const w = perWeekend[track];
      const findPos = (name: string) => {
        const r = (s.results || []).find((x) => String(x.name).toUpperCase() === name);
        return r ? parseInt(String(r.position)) : null;
      };
      const p = findPos(playerDriver);
      const t = findPos(teammate);
      const cat = (s.category || "").toLowerCase();
      if (cat === "race") { w.raceP = p; w.raceT = t; }
      else if (cat === "sprint") { w.sprintP = p; w.sprintT = t; }
      else if (cat.includes("quali") || cat.includes("shootout")) { w.qualiP = p; w.qualiT = t; }
    });
    return Object.values(perWeekend);
  }, [sessions, playerDriver, teammate]);

  const totals = useMemo(() => {
    let raceW = 0, raceL = 0, qW = 0, qL = 0, sW = 0, sL = 0;
    let ptsP = 0, ptsT = 0;
    rows.forEach((r) => {
      if (r.raceP && r.raceT) {
        if (r.raceP < r.raceT) raceW++; else if (r.raceP > r.raceT) raceL++;
        ptsP += RACE_POINTS[r.raceP] || 0;
        ptsT += RACE_POINTS[r.raceT] || 0;
      }
      if (r.qualiP && r.qualiT) {
        if (r.qualiP < r.qualiT) qW++; else if (r.qualiP > r.qualiT) qL++;
      }
      if (r.sprintP && r.sprintT) {
        if (r.sprintP < r.sprintT) sW++; else if (r.sprintP > r.sprintT) sL++;
        ptsP += SPRINT_POINTS[r.sprintP] || 0;
        ptsT += SPRINT_POINTS[r.sprintT] || 0;
      }
    });
    return { raceW, raceL, qW, qL, sW, sL, ptsP, ptsT };
  }, [rows]);

  return (
    <>
      <ShellHeader crumbs={[{ label: `Season ${season}`, to: "/" }, { label: "Teammate H2H" }]} />
      <ShellPage>
        <h1 className="mb-4 text-2xl font-black">🤝 Teammate Head-to-Head</h1>
        {loading && <div className="text-white/50">Loading season data…</div>}
        {err && <div className="text-red-400">Failed to load: {err}</div>}
        {!loading && !playerDriver && (
          <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-white/60">
            No player sessions found for Season {season}.
          </div>
        )}
        {!loading && playerDriver && !teammate && (
          <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-white/60">
            No teammate found in <code className="text-white/80">driver_teams</code> for team{" "}
            <b>{playerTeam ?? "?"}</b>. Add your teammate to that table under season {season}.
          </div>
        )}

        {playerDriver && teammate && (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <PlayerCard name={playerDriver} team={playerTeam} you />
              <PlayerCard name={teammate} team={playerTeam} />
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-4">
              <Stat label="Race H2H" value={`${totals.raceW}–${totals.raceL}`} good={totals.raceW >= totals.raceL} />
              <Stat label="Quali H2H" value={`${totals.qW}–${totals.qL}`} good={totals.qW >= totals.qL} />
              <Stat label="Sprint H2H" value={`${totals.sW}–${totals.sL}`} good={totals.sW >= totals.sL} />
              <Stat label="Points" value={`${totals.ptsP} – ${totals.ptsT}`} good={totals.ptsP >= totals.ptsT} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-[11px] uppercase tracking-widest text-white/60">
                  <tr>
                    <th className="p-2 text-left">Track</th>
                    <th className="p-2">Quali {playerDriver}</th>
                    <th className="p-2">Quali {teammate}</th>
                    <th className="p-2">Race {playerDriver}</th>
                    <th className="p-2">Race {teammate}</th>
                    <th className="p-2">Sprint {playerDriver}</th>
                    <th className="p-2">Sprint {teammate}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.track} className="border-t border-white/5">
                      <td className="p-2 font-semibold">{titleCaseTrack(r.track)}</td>
                      <PosCell mine={r.qualiP} other={r.qualiT} />
                      <PosCell mine={r.qualiT} other={r.qualiP} flip />
                      <PosCell mine={r.raceP} other={r.raceT} />
                      <PosCell mine={r.raceT} other={r.raceP} flip />
                      <PosCell mine={r.sprintP} other={r.sprintT} />
                      <PosCell mine={r.sprintT} other={r.sprintP} flip />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/50">
              H2H compares your finishing / grid position vs your teammate in the same session. Missing
              rows mean neither session (or teammate result) was uploaded for that weekend.
            </p>
          </>
        )}

        <div className="mt-6">
          <Link to="/" className="text-sm text-red-400 hover:underline">← Back to season</Link>
        </div>
      </ShellPage>
    </>
  );
}

function PlayerCard({ name, team, you }: { name: string; team: string | null; you?: boolean }) {
  return (
    <div className={"rounded-lg border p-4 " + (you ? "border-red-500/60 bg-red-500/5" : "border-white/10 bg-white/[0.03]")}>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{you ? "You" : "Teammate"}</div>
      <div className="mt-1 text-2xl font-black">{name}</div>
      <div className="mt-1 text-xs text-white/60">{team || "—"}</div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={"mt-1 text-xl font-black " + (good ? "text-emerald-400" : "text-red-400")}>{value}</div>
    </div>
  );
}

function PosCell({ mine, other, flip }: { mine: any; other: any; flip?: boolean }) {
  if (!mine) return <td className="p-2 text-center text-white/30">—</td>;
  const better = mine && other && (flip ? mine < other : mine < other);
  return (
    <td className={"p-2 text-center font-mono " + (better ? "text-emerald-400" : mine && other ? "text-red-400" : "text-white/80")}>
      P{mine}
    </td>
  );
}