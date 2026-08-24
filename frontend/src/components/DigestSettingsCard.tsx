import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, BellRing, Send, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";

export default function DigestSettingsCard() {
  const [triggering, setTriggering] = useState(false);

  async function handleTriggerNow() {
    setTriggering(true);
    try {
      const res = await api.triggerDigest();
      toast.success(res.message || "Task digest dispatched successfully!");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to trigger digest");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Automated Task Digests</h2>
        </div>
        <span className="badge badge-info flex items-center gap-1">
          <Clock className="w-3 h-3" /> Scheduled
        </span>
      </div>

      <p className="text-xs text-ink-muted leading-relaxed mb-4">
        Compile all open action items across past meetings into formatted daily or weekly summary digests delivered straight to your email or Slack channel.
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.04] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-300" />
              <div>
                <p className="text-xs font-bold text-slate-200">Email Digest Broadcast</p>
                <p className="text-[10px] text-ink-muted">Formatted HTML table with priorities &amp; deadlines</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-slate-300" />
              <div>
                <p className="text-xs font-bold text-slate-200">Slack Channel Broadcast</p>
                <p className="text-[10px] text-ink-muted">Daily reminder to designated team channel</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-xs text-slate-400">
            Want an instant digest report sent right now?
          </span>
          <button
            onClick={handleTriggerNow}
            disabled={triggering}
            className="btn-primary text-xs !py-2 !px-4"
          >
            {triggering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1.5" />
            )}
            Send Digest Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}
