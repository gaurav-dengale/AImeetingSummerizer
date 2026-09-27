import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Circle, ChevronRight, X, Rocket,
  Mic, HelpCircle
} from "lucide-react";
import type { StatusResponse } from "../lib/api";

interface Props {
  status: StatusResponse | null;
  onDismiss: () => void;
  onShowOnboarding: () => void;
  onGoToSettings: () => void;
}

export default function GettingStartedCard({ status, onDismiss, onShowOnboarding, onGoToSettings }: Props) {
  const googleDone = status?.googleConfigured === true;
  const contactsDone = (status?.contactsCount ?? 0) > 0;
  const aiBotDone = status?.aiServiceHealth?.status === "UP";

  const steps = [
    {
      id: "ai",
      label: "AI Engine running",
      desc: "Groq-powered transcription & summarization is active",
      done: aiBotDone,
      action: null,
    },
    {
      id: "google",
      label: "Connect Google Calendar & Gmail",
      desc: "Auto-create calendar events and email task assignments",
      done: googleDone,
      action: () => window.location.assign("/authorize_google"),
      actionLabel: "Authorize →",
    },
    {
      id: "contacts",
      label: "Add your team contacts",
      desc: "Upload a contacts.csv so AI can assign tasks to people",
      done: contactsDone,
      action: onGoToSettings,
      actionLabel: "Open Settings →",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (allDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="glass-card border-l-4 border-l-primary relative overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss — I'll set up later"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Getting Started
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                {completedCount}/{steps.length} complete
              </span>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Complete setup to unlock the full power of MeetIQ</p>
          </div>
          <button
            onClick={onShowOnboarding}
            className="text-xs flex items-center gap-1 text-ink-muted hover:text-white transition-colors shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Tour
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-black/30 rounded-full h-1.5 mb-5 overflow-hidden">
          <motion.div
            className="h-1.5 rounded-full bg-gradient-to-r from-primary to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                step.done
                  ? "bg-emerald-500/5 border-emerald-500/20 opacity-70"
                  : "bg-black/20 border-white/[0.06] hover:border-white/12"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-ink-muted/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${step.done ? "line-through text-ink-muted" : "text-white"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-ink-muted truncate">{step.desc}</p>
              </div>
              {!step.done && step.action && (
                <button
                  onClick={step.action}
                  className="text-xs font-semibold text-primary hover:text-white flex items-center gap-1 transition-colors shrink-0"
                >
                  {step.actionLabel} <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {step.done && (
                <span className="text-[10px] font-semibold text-emerald-400 shrink-0">Done ✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Quick start hint */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-ink-muted">
          <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Ready to try?{" "}
            <span className="text-white font-semibold">
              Scroll down to "Local Speech & Whisper" and click Start Recording.
            </span>
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
