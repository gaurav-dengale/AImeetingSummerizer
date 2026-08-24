import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mail, MessageSquare, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { cardHover, cardTap, popIn } from "../lib/variants";
import MagneticButton from "./MagneticButton";

interface DispatchResult {
  success: boolean;
  message: string;
  details?: { email?: boolean; slack?: boolean };
}

export default function ManualDispatcherCard() {
  const [recipientName, setRecipientName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<DispatchResult | null>(null);

  async function handleSend() {
    if (!recipientName.trim()) {
      toast.error("Enter a recipient name first");
      return;
    }
    if (!taskDesc.trim()) {
      toast.error("Enter a task description");
      return;
    }

    setBusy(true);
    setLastResult(null);
    try {
      const res = await api.sendTaskNotificationManual(
        recipientName.trim(),
        taskDesc.trim(),
        dueDate.trim() || undefined
      );
      const result: DispatchResult = {
        success: true,
        message: res.message ?? `Task dispatched to ${recipientName}`,
        details: res.details as { email?: boolean; slack?: boolean } | undefined,
      };
      setLastResult(result);
      toast.success(result.message);
      setRecipientName("");
      setTaskDesc("");
      setDueDate("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to dispatch task";
      setLastResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" /> Manual Task Dispatcher
        </h2>
        <span className="badge badge-info">Ad-hoc</span>
      </div>
      <p className="text-ink-muted text-sm mb-4">
        Manually assign a task to any contact — delivers via email and/or Slack based on their
        CSV entry.
      </p>

      <div className="space-y-3 mb-4">
        <input
          className="input-control"
          placeholder="Recipient name (must match contacts.csv)"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
        <textarea
          className="input-control min-h-[80px] resize-y"
          placeholder="Task description..."
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
        />
        <input
          type="date"
          className="input-control"
          placeholder="Due date (optional)"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <MagneticButton
        className="btn-primary w-full"
        onClick={handleSend}
        disabled={busy}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Send Task Notification
      </MagneticButton>

      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.success ? "ok" : "err"}
            variants={popIn}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              lastResult.success
                ? "bg-accent-green/10 border-accent-green/25 text-emerald-300"
                : "bg-accent-rose/10 border-accent-rose/25 text-rose-300"
            }`}
          >
            <div className="flex items-start gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{lastResult.message}</p>
                {lastResult.details && (
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email: {lastResult.details.email ? "✓ Sent" : "✗ Not sent"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Slack: {lastResult.details.slack ? "✓ Sent" : "✗ Not sent"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
