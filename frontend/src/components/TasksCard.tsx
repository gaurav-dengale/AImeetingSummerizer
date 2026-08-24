import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, Send, Mail, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TaskItem } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";

interface Props {
  tasks: TaskItem[];
}

export default function TasksCard({ tasks }: Props) {
  const [resending, setResending] = useState<number | null>(null);

  async function resend(index: number, task: TaskItem) {
    setResending(index);
    try {
      const res = await api.sendTaskNotificationManual(task.assignee, task.task, task.due_date ?? undefined);
      toast.success(res.message ?? `Dispatched to ${task.assignee}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to dispatch");
    } finally {
      setResending(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> Extracted Action Items &amp; Tasks
        </h2>
        <span className="badge badge-active">{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-slate-500 italic text-sm">
          No tasks detected yet. Transcribe meeting speech to trigger Groq LLM extraction.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {tasks.map((t, i) => (
              <motion.div
                key={i}
                layout
                variants={listItem}
                initial="hidden"
                animate="show"
                exit="exit"
                className="bg-slate-800/40 border border-white/[0.06] rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 mb-1.5">{t.task}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>
                      Assignee: <strong className="text-slate-200">{t.assignee}</strong>
                    </span>
                    <span>Due: {t.due_date || "None"}</span>
                    <span className={`channel-status ${t.email_sent ? "sent" : "not-sent"}`}>
                      <Mail className="w-3 h-3" /> {t.email_sent ? "Sent" : "Not sent"}
                    </span>
                    <span className={`channel-status ${t.slack_sent ? "sent" : "not-sent"}`}>
                      <MessageSquare className="w-3 h-3" /> {t.slack_sent ? "Sent" : "Not sent"}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-secondary !py-2 !px-3.5 text-xs"
                  onClick={() => resend(i, t)}
                  disabled={resending === i}
                >
                  {resending === i ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Resend
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
