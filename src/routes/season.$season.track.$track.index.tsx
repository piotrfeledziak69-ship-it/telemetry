import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  fetchSessions,
  loadCachedSessions,
  trackSlug,
  trackFlag,
  trackMapUrl,
  titleCaseTrack,
  badgesFor,
  type Session,
} from "@/lib/f1-shell";
import { ShellHeader, ShellPage } from "@/components/f1/ShellHeader";

export const Route = createFileRoute("/season/$season/track/$track/")({
  component: TrackPage,
});

const OPTIONS: { view: string; label: string; icon: string; desc: string }[] = [
  { view: "standings",   label: "Standings",        icon: "🏆", desc: "Full season table for the championship" },
  { view: "records",     label: "All-Time Records", icon: "📚", desc: "Career points, wins, podiums, DOTD" },
  { view: "quali-results", label: "Qualifying",     icon: "⏱️", desc: "Q1–Q3 / shootout times" },
  { view: "assignments", label: "Teams",            icon: "🏎️", desc: "Driver / constructor pairings" },
  { view: "race-story",  label: "Race Story",       icon: "🎬", desc: "Position changes, stints, classification" },
  { view: "graphs",      label: "Graphs",           icon: "📊", desc: "Lap times, fuel, ERS, tyre wear + faults" },
  { view: "data",        label: "Laps",             icon: "📋", desc: "Per-lap table and stint summary" },
  { view: "practice",    label: "Practice",         icon: "🏁", desc: "Free practice fuel calculator" },
];

function matchesCat(s: Session, bucket: string | undefined) {
  if (!bucket) return true;
  const c = s.category || "Race";
  if (bucket === "Sprint") return c === "Sprint" || c === "Sprint Qualifying" || c === "Sprint Shootout";
  if (bucket === "Practice") return c === "Practice";
  return c !== "Sprint" && c !== "Sprint Qualifying" && c !== "Sprint Shootout" && c !== "Practice";
}

function TrackPage() {
  const { season, track } = Route.useParams();
  const { cat } = Route.useSearch();
  const seasonN = Number(season);
  const cached = typeof window !== "undefined" ? loadCachedSessions() : null;
  const [sessions, setSessions] = useState<Session[]>(cached ?? []);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchSessions(seasonN).then(setSessions).catch(() => {});
  }, [seasonN]);

  const trackSessions = useMemo(
    () => sessions.filter(
      (s) =>
        Number(s.season) === seasonN &&
        trackSlug(s.track_name) === trackSlug(track) &&
        matchesCat(s, cat),
    ),
    [sessions, track, seasonN, cat],
  );
  const canonicalName = trackSessions[0]?.track_name ?? track;
  const displayName = titleCaseTrack(canonicalName);
  const cats = Array.from(new Set(trackSessions.map((s) => s.category).filter(Boolean)));
  const race = trackSessions.find((s) => s.category === "Race");
  const infoSummary = race?.session_info
    ? `${race.session_info.track_name ?? canonicalName} · ${race.session_info.total_laps ?? "?"} laps · ${race.session_info.weather ?? ""}`
    : `Session data for ${canonicalName}`;

  const badgeAgg: Record<string, boolean> = {};
  trackSessions.forEach((s) => {
    const b = badgesFor(s);
    Object.entries(b).forEach(([k, v]) => { if (v) badgeAgg[k] = true; });
  });

  useEffect(() => {
    const key = `f1.notes.${seasonN}.${trackSlug(track)}`;
    setNotes(localStorage.getItem(key) || "");
  }, [seasonN, track]);
  useEffect(() => {
    const key = `f1.notes.${seasonN}.${trackSlug(track)}`;
    const id = setTimeout(() => localStorage.setItem(key, notes), 400);
    return () => clearTimeout(id);
  }, [notes, seasonN, track]);

  const [imgOk, setImgOk] = useState(true);

  return (
    <>
      <ShellHeader
        crumbs={[
          { label: `Season ${season}`, to: "/" },
          { label: cat ? `${displayName} · ${cat}` : displayName },
        ]}
      />
      <ShellPage>
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-4xl">{trackFlag(canonicalName)}</span>
              <h1 className="text-3xl font-black">
                {displayName}
                {cat && <span className="ml-3 text-lg font-bold text-white/60">{cat}</span>}
              </h1>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {cats.map((c) => (
                <span key={c} className="rounded border border-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                  {c}
                </span>
              ))}
              {badgeAgg.gs && <Tag color="#c084fc">Grand Slam</Tag>}
              {badgeAgg.win && <Tag color="#ffd700">Win</Tag>}
              {badgeAgg.pole && <Tag color="#5ad1ff">Pole</Tag>}
              {badgeAgg.fl && <Tag color="#a855f7">Fastest Lap</Tag>}
            </div>
            <p className="mb-4 text-sm text-white/70">{infoSummary}</p>
            <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Setup notes, strategy ideas, quali splits…"
              className="min-h-[120px] w-full rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
            {imgOk ? (
              <img
                src={trackMapUrl(canonicalName)}
                alt={canonicalName}
                className="h-full w-full object-contain p-4"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-6xl opacity-40">
                {trackFlag(canonicalName)}
              </div>
            )}
          </div>
        </section>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {OPTIONS.map((o) => (
            <Link
              key={o.view}
              to="/season/$season/track/$track/$view"
              params={{ season, track, view: o.view }}
              search={{ cat }}
              className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-red-500/60"
            >
              <span className="text-2xl">{o.icon}</span>
              <div className="flex-1">
                <div className="text-base font-bold">{o.label}</div>
                <div className="mt-0.5 text-xs text-white/60">{o.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </ShellPage>
    </>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="rounded-sm px-2 py-0.5 text-[11px] font-black text-black" style={{ background: color }}>
      {children}
    </span>
  );
}
