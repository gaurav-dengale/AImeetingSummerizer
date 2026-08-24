import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Mail, MessageSquare, CheckCircle2, Clock, Sparkles, Send, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";

interface BiDirectionalSyncCardProps {
  onTaskUpdated?: () => void;
}

export default function BiDirectionalSyncCard({ onTaskUpdated }: BiDirectionalSyncCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<{
    success: boolean;
    action?: string;
    task?: string;
    new_due_date?: string;
    message?: string;
    source?: string;
  } | null>(null);
  const [customReply, setCustomReply] = useState("");

  async function runSimulation(type: "email_done" | "slack_reaction" | "email_delay" | "custom") {
    setLoading(type);
    try {
      let payload: { channel: string; responseText?: string; reaction?: string } = {
        channel: "email",
      };

      if (type === "email_done") {
        payload = { channel: "email", responseText: "Done, deployed the database migration." };
      } else if (type === "slack_reaction") {
        payload = { channel: "slack", reaction: "white_check_mark" };
      } else if (type === "email_delay") {
        payload = { channel: "email", responseText: "Need 2 more days to finish testing." };
      } else if (type === "custom") {
        payload = { channel: "email", responseText: customReply || "Done" };
      }

      const res = await api.simulateBiDirectionalSync(payload);
      setLastEvent(res);
      if (res.action === "marked_done") {
        toast.success("✅ Inbound reply received — Task marked Done!");
      } else if (res.action === "deadline_extended") {
        toast.info(`⏳ Inbound reply received — Deadline extended to ${res.new_due_date}`);
      } else {
        toast.success("Inbound sync event processed!");
      }

      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Failed to process inbound event");
      setLastEvent({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">Bi-Directional Task Sync</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Closes The Loop
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Replies via Email or Slack automatically update task status and deadlines in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Mail className="w-4 h-4" />
            <span>Email Reply Detection</span>
          </div>
          <p className="text-xs text-slate-300">
            Replying <code className="text-emerald-300 bg-emerald-950/50 px-1 py-0.5 rounded">"Done, deployed it"</code> marks the task <strong className="text-emerald-300">✅ Done</strong> instantly.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <MessageSquare className="w-4 h-4" />
            <span>Slack Emoji Reaction</span>
          </div>
          <p className="text-xs text-slate-300">
            Reacting with <code className="text-sky-300 bg-sky-950/50 px-1 py-0.5 rounded">✅</code> on Slack auto-completes the corresponding task in the database.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>Smart Deadline Adjustment</span>
          </div>
          <p className="text-xs text-slate-300">
            Replying <code className="text-amber-300 bg-amber-950/50 px-1 py-0.5 rounded">"Need 2 more days"</code> extends the due date and flags it for review.
          </p>
        </div>
      </div>

      {/* Live Interactive Simulator */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            Live Inbound Simulator (Test Feedback Loop)
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">POST /api/webhooks/simulate</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => runSimulation("email_done")}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading === "email_done" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Simulate Email: "Done, deployed it"
          </button>

          <button
            onClick={() => runSimulation("slack_reaction")}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading === "slack_reaction" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>💬</span>}
            Simulate Slack: Add ✅ Reaction
          </button>

          <button
            onClick={() => runSimulation("email_delay")}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading === "email_delay" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            Simulate Reply: "Need 2 more days"
          </button>
        </div>

        {/* Custom text input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder='Or type a custom reply (e.g. "Completed the database task")...'
            value={customReply}
            onChange={(e) => setCustomReply(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => runSimulation("custom")}
            disabled={!customReply.trim() || !!loading}
            className="btn btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            {loading === "custom" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Test Inbound
          </button>
        </div>

        {/* Live Feedback Banner */}
        {lastEvent && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-3 rounded-lg border text-xs flex items-start gap-2 ${
              lastEvent.success
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
            }`}
          >
            {lastEvent.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold">
                {lastEvent.action === "marked_done" && "✅ Task Automatically Marked Done in PostgreSQL & UI!"}
                {lastEvent.action === "deadline_extended" && `⏳ Deadline Extended to ${lastEvent.new_due_date}!`}
                {lastEvent.action === "flagged_for_review" && "👀 Inbound Reply Flagged for Review"}
                {!lastEvent.action && (lastEvent.message || "Processed inbound sync")}
              </div>
              {lastEvent.task && (
                <div className="text-slate-400">
                  Target Task: <span className="text-slate-200">"{lastEvent.task}"</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
