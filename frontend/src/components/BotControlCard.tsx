import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Search, Square, Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TranscriptResponse } from "../lib/api";
import { extractMeetingId } from "../lib/format";
import { cardHover, cardTap } from "../lib/variants";
import MagneticButton from "./MagneticButton";
import FeatureTip from "./FeatureTip";

interface Props {
  onResult: (data: TranscriptResponse) => void;
}

type BotState = "idle" | "joining" | "active" | "fetching" | "stopping" | "done";

const STEPS = [
  { id: "join", label: "Launch Bot" },
  { id: "analyze", label: "Fetch & Analyze" },
  { id: "done", label: "Complete" },
];

export default function BotControlCard({ onResult }: Props) {
  const [link, setLink] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [botState, setBotState] = useState<BotState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const busy = botState === "joining" || botState === "fetching" || botState === "stopping";
  const isActive = botState === "active" || botState === "fetching";

  async function handleJoin() {
    if (!link.trim()) { toast.error("Enter a Google Meet link first"); return; }
    setBotState("joining");
    setStatusText("Requesting Vexa bot creation...");
    try {
      await api.createBot(link.trim());
      const id = extractMeetingId(link.trim()) ?? link.trim();
      setMeetingId(id);
      setBotState("active");
      setCurrentStep(1);
      setStatusText(`Bot is live in: ${id}`);
      toast.success("Bot is joining the meeting");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
      setBotState("idle");
    }
  }

  async function handleFetch() {
    if (!meetingId) { toast.error("No active meeting."); return; }
    setBotState("fetching");
    setStatusText("Fetching transcript & running Groq AI analysis...");
    try {
      const data = await api.fetchTranscript(meetingId);
      onResult(data);
      setBotState("done");
      setCurrentStep(2);
      setStatusText("Transcript & AI intelligence applied.");
      toast.success("Transcript analyzed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
      setBotState("active");
    }
  }

  async function handleStop() {
    setBotState("stopping");
    try {
      await api.stopBot(meetingId ?? undefined);
      setStatusText("Bot stopped.");
      setMeetingId(null);
      setBotState("idle");
      setCurrentStep(0);
      toast.success("Bot stopped");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach backend";
      setStatusText(msg);
      toast.error(msg);
      setBotState("active");
    }
  }

  function handleReset() {
    setBotState("idle");
    setCurrentStep(0);
    setMeetingId(null);
    setStatusText(null);
    setLink("");
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" /> Vexa Google Meet Bot
          <FeatureTip tip="Sends an AI bot to join your Google Meet call. The bot silently records and transcribes the meeting. Click 'Fetch & Analyze' after the meeting to get your summary and tasks." />
        </h2>
        <span className="badge badge-info">Cloud / Self-hosted</span>
      </div>

      <p className="text-ink-muted text-sm -mt-2">
        Dispatch an AI recording bot into any Google Meet call.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
              i < currentStep
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                : i === currentStep
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-white/[0.04] text-ink-muted border border-white/[0.06]"
            }`}>
              {i < currentStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : i === currentStep ? (
                <Circle className="w-3.5 h-3.5 shrink-0 text-primary" />
              ) : (
                <Circle className="w-3.5 h-3.5 shrink-0 opacity-30" />
              )}
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className={`w-3 h-3 shrink-0 ${i < currentStep ? "text-emerald-400" : "text-ink-muted/30"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Input — only show in idle/active */}
      <AnimatePresence>
        {(botState === "idle") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <input
              className="input-control"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && meetingId && (
        <div className="badge badge-active self-start">Active session: {meetingId}</div>
      )}

      {/* Primary action button — morphs by state */}
      <div className="flex flex-wrap gap-3 mt-auto">
        {botState === "idle" && (
          <MagneticButton className="btn-primary" onClick={handleJoin} disabled={busy}>
            <Video className="w-4 h-4" /> Launch Bot
          </MagneticButton>
        )}

        {botState === "joining" && (
          <button className="btn-primary" disabled>
            <Loader2 className="w-4 h-4 animate-spin" /> Joining Meeting...
          </button>
        )}

        {(botState === "active" || botState === "fetching") && (
          <>
            <MagneticButton className="btn-primary" onClick={handleFetch} disabled={botState === "fetching"}>
              {botState === "fetching" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Fetch &amp; Analyze
            </MagneticButton>
            <button className="btn-danger" onClick={handleStop} disabled={busy}>
              <Square className="w-4 h-4" />
              Stop Bot
            </button>
          </>
        )}

        {botState === "stopping" && (
          <button className="btn-danger" disabled>
            <Loader2 className="w-4 h-4 animate-spin" /> Stopping...
          </button>
        )}

        {botState === "done" && (
          <>
            <span className="badge badge-active text-sm self-center">
              <CheckCircle2 className="w-4 h-4" /> Analysis Complete
            </span>
            <button className="btn-secondary text-xs" onClick={handleReset}>
              New Meeting
            </button>
          </>
        )}
      </div>

      {statusText && (
        <p className={`text-xs ${botState === "done" ? "text-emerald-400" : "text-ink-muted"}`}>
          {statusText}
        </p>
      )}
    </motion.div>
  );
}
