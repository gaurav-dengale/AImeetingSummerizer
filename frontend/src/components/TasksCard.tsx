import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ListChecks,
  Send,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Circle,
  RotateCw,
  Link as LinkIcon,
  Flame,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TaskItem } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";

interface Props {
  tasks: TaskItem[];
  onTaskUpdated?: () => void;
}

export default function TasksCard({ tasks, onTaskUpdated }: Props) {
  const [resendingIndex, setResendingIndex] = useState<number | null>(null);
  const [retryingEmailId, setRetryingEmailId] = useState<number | null>(null);
  const [retryingSlackId, setRetryingSlackId] = useState<number | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<number | string, string>>({});

  async function toggleStatus(task: TaskItem, index: number) {
    const taskId = task.id ?? task.db_id;
    const currentStatus = localStatuses[taskId ?? index] ?? task.status ?? "pending";
    const nextStatus = currentStatus === "done" ? "pending" : "done";

    setLocalStatuses((prev) => ({ ...prev, [taskId ?? index]: nextStatus }));

    if (taskId) {
      try {
        await api.updateTaskStatus(taskId, nextStatus);
        toast.success(`Task marked as ${nextStatus}`);
        onTaskUpdated?.();
      } catch {
        setLocalStatuses((prev) => ({ ...prev, [taskId ?? index]: currentStatus }));
        toast.error("Failed to update task status in DB");
      }
    } else {
      toast.info(`Task marked as ${nextStatus}`);
    }
  }

  async function retryEmail(taskId?: number) {
    if (!taskId) return;
    setRetryingEmailId(taskId);
    try {
      const res = await api.retryTaskEmail(taskId);
      if (res.success) {
        toast.success(res.message);
        onTaskUpdated?.();
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Email retry failed");
    } finally {
      setRetryingEmailId(null);
    }
  }

  async function retrySlack(taskId?: number) {
    if (!taskId) return;
    setRetryingSlackId(taskId);
    try {
      const res = await api.retryTaskSlack(taskId);
      if (res.success) {
        toast.success(res.message);
        onTaskUpdated?.();
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Slack retry failed");
    } finally {
      setRetryingSlackId(null);
    }
  }

  async function resendManual(index: number, task: TaskItem) {
    setResendingIndex(index);
    try {
      const res = await api.sendTaskNotificationManual(task.assignee, task.task, task.due_date ?? undefined);
      toast.success(res.message ?? `Dispatched to ${task.assignee}`);
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to dispatch");
    } finally {
      setResendingIndex(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Extracted Action Items &amp; Tasks</h2>
        </div>
        <span className="badge badge-active">{tasks.length} tasks</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-slate-500 italic text-sm py-4 text-center">
          No tasks detected yet. Transcribe meeting speech to trigger Groq LLM extraction.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {tasks.map((t, i) => {
              const taskId = t.id ?? t.db_id;
              const status = localStatuses[taskId ?? i] ?? t.status ?? "pending";
              const isDone = status === "done";
              const isPendingReview = status === "pending_review";
              const priority = t.priority ?? "medium";
              const confidence = t.confidence ?? 50;

              return (
                <motion.div
                  key={taskId ?? i}
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className={`border rounded-2xl px-5 py-4 transition-all duration-200 ${
                    isDone
                      ? "bg-slate-900/30 border-emerald-500/20 opacity-75"
                      : isPendingReview
                      ? "bg-amber-950/20 border-amber-500/30"
                      : "bg-slate-800/40 border-white/[0.06]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-[260px]">
                      {/* Status Toggle (#2 Task status tracking) */}
                      <button
                        onClick={() => toggleStatus(t, i)}
                        title={isDone ? "Mark Pending" : "Mark Done"}
                        className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors focus:outline-none"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400" />
                        )}
                      </button>

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-sm font-semibold transition-all ${
                              isDone ? "line-through text-slate-400" : "text-slate-100"
                            }`}
                          >
                            {t.task}
                          </h4>

                          {/* Priority Badge (#14 Sentiment / Priority) */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                              priority === "critical"
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : priority === "low"
                                ? "bg-slate-700/40 text-slate-400 border border-slate-600/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            }`}
                          >
                            {priority === "critical" && <Flame className="w-3 h-3 text-red-400" />}
                            {priority}
                          </span>

                          {/* Confidence Score (#12 Confidence-Gated) */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              confidence >= 80
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : confidence >= 50
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                            title={`AI Confidence: ${confidence}%`}
                          >
                            {confidence >= 80 ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                            )}
                            {confidence}% conf
                          </span>

                          {/* Cross-Meeting Link (#13) */}
                          {t.linked_task_id && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <LinkIcon className="w-2.5 h-2.5" /> Linked #{t.linked_task_id}
                            </span>
                          )}

                          {isPendingReview && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                              Review Needed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span>
                            Assignee: <strong className="text-slate-200">{t.assignee || "Unassigned"}</strong>
                          </span>
                          <span>•</span>
                          <span>Due: {t.due_date || "None"}</span>

                          {/* Email Status & Retry (#3 Retry button) */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`channel-status ${
                                t.email_sent ? "sent" : t.email_failed ? "not-sent bg-rose-950/40 text-rose-300" : "not-sent"
                              }`}
                            >
                              <Mail className="w-3 h-3" />
                              {t.email_sent ? "Email Sent" : t.email_failed ? "Email Failed" : "Email Pending"}
                            </span>
                            {t.email_failed && taskId && (
                              <button
                                onClick={() => retryEmail(taskId)}
                                disabled={retryingEmailId === taskId}
                                title="Retry sending email"
                                className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-900/30 rounded-md transition-colors"
                              >
                                {retryingEmailId === taskId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCw className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Slack Status & Retry (#3 Retry button) */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`channel-status ${
                                t.slack_sent ? "sent" : t.slack_failed ? "not-sent bg-rose-950/40 text-rose-300" : "not-sent"
                              }`}
                            >
                              <MessageSquare className="w-3 h-3" />
                              {t.slack_sent ? "Slack Sent" : t.slack_failed ? "Slack Failed" : "Slack Pending"}
                            </span>
                            {t.slack_failed && taskId && (
                              <button
                                onClick={() => retrySlack(taskId)}
                                disabled={retryingSlackId === taskId}
                                title="Retry sending Slack"
                                className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-900/30 rounded-md transition-colors"
                              >
                                {retryingSlackId === taskId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCw className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn-secondary !py-2 !px-3.5 text-xs self-center"
                      onClick={() => resendManual(i, t)}
                      disabled={resendingIndex === i}
                    >
                      {resendingIndex === i ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Dispatch
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

