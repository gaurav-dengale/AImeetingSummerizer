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
  const [localEmailSent, setLocalEmailSent] = useState<Record<number | string, boolean>>({});
  const [localSlackSent, setLocalSlackSent] = useState<Record<number | string, boolean>>({});




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
        setLocalEmailSent((prev) => ({ ...prev, [taskId]: true }));
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
        setLocalSlackSent((prev) => ({ ...prev, [taskId]: true }));
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
    const taskId = task.id ?? task.db_id;
    try {
      const res = await api.sendTaskNotificationManual(task.assignee, task.task, task.due_date ?? undefined);
      setLocalEmailSent((prev) => ({ ...prev, [taskId ?? index]: true }));
      toast.success(res.message ?? `Dispatched to ${task.assignee}`);
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to dispatch");
    } finally {
      setResendingIndex(null);
    }
  }


  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const filteredTasks = tasks.filter((t, i) => {
    const taskId = t.id ?? t.db_id;
    const currentStatus = localStatuses[taskId ?? i] ?? t.status ?? "pending";
    if (filter === "pending") return currentStatus !== "done";
    if (filter === "done") return currentStatus === "done";
    return true;
  });

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Extracted Action Items &amp; Tasks</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              filter === "all" ? "bg-primary/20 text-primary border border-primary/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              filter === "pending" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending ({tasks.filter((t, i) => (localStatuses[t.id ?? t.db_id ?? i] ?? t.status ?? "pending") !== "done").length})
          </button>
          <button
            onClick={() => setFilter("done")}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              filter === "done" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Completed ({tasks.filter((t, i) => (localStatuses[t.id ?? t.db_id ?? i] ?? t.status ?? "pending") === "done").length})
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-primary/50" />
          </div>
          <div>
            <p className="text-slate-300 font-semibold text-sm">
              {filter === "all" ? "No tasks extracted yet" : filter === "pending" ? "All tasks completed! 🎉" : "No completed tasks yet"}
            </p>
            <p className="text-ink-muted text-xs mt-1">
              {filter === "all" ? "Transcribe meeting speech to trigger Groq LLM extraction." : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredTasks.map((t, i) => {

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
                  className={`border rounded-2xl px-5 py-4 transition-all duration-200 border-l-[3px] ${
                    isDone
                      ? "bg-slate-900/30 border-emerald-500/20 border-l-emerald-500/40 opacity-75"
                      : isPendingReview
                      ? "bg-amber-950/20 border-amber-500/30 border-l-amber-500"
                      : priority === "critical"
                      ? "bg-slate-800/40 border-white/[0.06] border-l-rose-500"
                      : priority === "low"
                      ? "bg-slate-800/40 border-white/[0.06] border-l-slate-600"
                      : "bg-slate-800/40 border-white/[0.06] border-l-blue-500"
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

                          {/* Confidence Score — mini progress bar */}
                          <div className="flex items-center gap-1.5" title={`AI Confidence: ${confidence}%`}>
                            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                className={`h-1.5 rounded-full ${
                                  confidence >= 80 ? "bg-emerald-500" : confidence >= 50 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${confidence}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                              />
                            </div>
                            <span className={`text-[10px] font-semibold ${
                              confidence >= 80 ? "text-emerald-400" : confidence >= 50 ? "text-amber-400" : "text-rose-400"
                            }`}>{confidence}%</span>
                          </div>

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
                          {(() => {
                            const isEmailSent = localEmailSent[taskId ?? i] ?? t.email_sent;
                            const isSlackSent = localSlackSent[taskId ?? i] ?? t.slack_sent;
                            return (
                              <>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`channel-status ${
                                      isEmailSent ? "sent" : t.email_failed ? "not-sent bg-rose-950/40 text-rose-300" : "not-sent"
                                    }`}
                                  >
                                    <Mail className="w-3 h-3" />
                                    {isEmailSent ? "Email Sent" : t.email_failed ? "Email Failed" : "Email Pending"}
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
                                      isSlackSent ? "sent" : t.slack_failed ? "not-sent bg-rose-950/40 text-rose-300" : "not-sent"
                                    }`}
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    {isSlackSent ? "Slack Sent" : t.slack_failed ? "Slack Failed" : "Slack Pending"}
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
                              </>
                            );
                          })()}

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

