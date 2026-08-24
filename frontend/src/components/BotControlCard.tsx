import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Search, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TranscriptResponse } from "../lib/api";
import { extractMeetingId } from "../lib/format";
import { cardHover, cardTap } from "../lib/variants";
import MagneticButton from "./MagneticButton";

interface Props {
  onResult: (data: TranscriptResponse) => void;
}

type Busy = "join" | "fetch" | "stop" | null;

export default function BotControlCard({ onResult }: Props) {
  const [link, setLink] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  async function handleJoin() {
    if (!link.trim()) {
      toast.error("Enter a Google Meet link first");
      return;
    }
    setBusy("join");
    setStatusText("Requesting Vexa bot creation...");
    try {
      await api.createBot(link.trim());
      const id = extractMeetingId(link.trim()) ?? link.trim();
      setMeetingId(id);
      setStatusText(`Bot launched. Active meeting: ${id}`);
      toast.success("Bot is joining the meeting");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleFetch() {
    if (!meetingId) {
      toast.error("No active meeting. Join a meeting first.");
      return;
    }
    setBusy("fetch");
    setStatusText("Fetching transcript & running Groq AI analysis...");
    try {
      const data = await api.fetchTranscript(meetingId);
      onResult(data);
      setStatusText("Transcript & AI intelligence updated.");
      toast.success("Transcript analyzed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleStop() {
    setBusy("stop");
    try {
      await api.stopBot(meetingId ?? undefined);
      setStatusText("Bot stopped.");
      setMeetingId(null);
      toast.success("Bot stopped");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" /> Vexa Google Meet Bot
        </h2>
        <span className="badge badge-info">Cloud / Self-hosted</span>
      </div>
      <p className="text-ink-muted text-sm mb-4">
        Dispatch an AI meeting recorder bot directly into any Google Meet video call.
      </p>

      <input
        className="input-control mb-4"
        placeholder="https://meet.google.com/abc-defg-hij"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />

      {meetingId && (
        <div className="badge badge-active mb-4">Active session: {meetingId}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <MagneticButton className="btn-primary" onClick={handleJoin} disabled={busy !== null}>
          {busy === "join" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          Join Meeting
        </MagneticButton>
        <button className="btn-secondary" onClick={handleFetch} disabled={busy !== null || !meetingId}>
          {busy === "fetch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Fetch &amp; Analyze
        </button>
        <button className="btn-danger" onClick={handleStop} disabled={busy !== null || !meetingId}>
          {busy === "stop" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
          Stop Bot
        </button>
      </div>

      {statusText && <p className="text-xs text-ink-muted mt-4">{statusText}</p>}
    </motion.div>
  );
}
