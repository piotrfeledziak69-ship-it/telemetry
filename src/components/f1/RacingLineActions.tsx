import { useEffect, useState } from "react";
import { CloudUpload, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { smoothRacingLine } from "@/lib/line-smooth";
import { downloadRacingLineCollection, validRacingLine } from "@/lib/racing-lines";
import { saveTrackData } from "@/lib/track-cloud";
import { trackSlug } from "@/lib/f1-shell";
import type { Point } from "@/lib/quali-simulation";

type Props = {
  track: string;
  mapUrl: string;
  line: Point[];
  onDraft: (points: Point[]) => void;
};

export function RacingLineActions({ track, mapUrl, line, onDraft }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setMessage(""); setError(""); }, [track, mapUrl]);

  function smooth() {
    if (!validRacingLine(line)) return;
    onDraft(smoothRacingLine(line));
    setError("");
    setMessage("Line smoothed. Press again for more, then save it to your account.");
  }

  async function saveToAccount() {
    if (!validRacingLine(line)) return;
    setError("");
    try {
      const ok = await saveTrackData("racing_line", trackSlug(track), line);
      if (!ok) { setError("Sign in to save this line to your account."); return; }
      setMessage("Saved to your account — this line now shows on all your devices, in Qualifying and ERS Map.");
    } catch {
      setError("Couldn't save to your account. If this keeps happening, the track-data table may not be set up yet.");
    }
  }

  function exportCollection() {
    if (!validRacingLine(line)) return;
    try {
      downloadRacingLineCollection(track, line);
      setError("");
      setMessage("Collection downloaded. Replace src/data/racing-lines.json and redeploy to publish it for everyone.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The racing-line collection couldn't be downloaded.");
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" disabled={!validRacingLine(line)} onClick={smooth}>
          <Sparkles />AI smooth
        </Button>
        <Button variant="outline" className="flex-1" disabled={!validRacingLine(line)} onClick={exportCollection}>
          <Download />Download
        </Button>
      </div>
      <Button className="w-full" disabled={!validRacingLine(line)} onClick={saveToAccount}>
        <CloudUpload />Save line to my account
      </Button>
      <p className="text-xs text-muted-foreground">
        AI smooth evens out wobbles in the line you drew, keeping the start/finish point. Save it to your account so it follows you to every device.
      </p>
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
