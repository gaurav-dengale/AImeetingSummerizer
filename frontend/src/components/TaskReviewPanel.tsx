import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Edit3,
  Loader2,
  RefreshCw,
  Calendar,
  User,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type ReviewTaskItem } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";

interface Props {
  onTasksChanged?: () => void;
}

export default function TaskReviewPanel({ onTasksChanged }: Props) {
  const [tasks, setTasks] = useState<ReviewTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Edit form state
  const [editAssignee, setEditAssignee] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getPendingReview();
      setTasks(res.tasks || []);
    } catch {
      // Backend might be warming up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function handleApprove(task: ReviewTaskItem) {
    setActingId(task.id);
    try {
      const res = await api.approveReviewTask(task.id);
      if (res.success) {
        toast.success(`Approved & dispatched: "${task.task.slice(0, 30)}..."`);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        onTasksChanged?.();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to approve task");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(task: ReviewTaskItem) {
    setActingId(task.id);
    try {
      await api.rejectReviewTask(task.id);
      toast.info("Task rejected and archived.");
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      onTasksChanged?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to reject task");
    } finally {
      setActingId(null);
    }
  }

  function startEditing(task: ReviewTaskItem) {
    setEditingId(task.id);
    setEditAssignee(task.assignee || "");
    setEditTask(task.task || "");
    setEditDueDate(task.due_date || "");
  }

  async function saveEditAndApprove(task: ReviewTaskItem) {
    setActingId(task.id);
    try {
      const res = await api.editReviewTask(task.id, {
        assignee: editAssignee,
        task: editTask,
        due_date: editDueDate || undefined,
      });
      if (res.success) {
        toast.success("Task updated & dispatched!");
        setEditingId(null);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        onTasksChanged?.();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save & approve");
    } finally {
      setActingId(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Human-in-the-Loop Review Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPending}
            disabled={loading}
            className="btn-ghost !p-2 text-xs"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="badge badge-warning">{tasks.length} pending review</span>
        </div>
      </div>

      <p className="text-xs text-ink-muted mb-4">
        Tasks with AI confidence under 80% or uncertain assignees are held here for human sign-off before automated dispatching.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading review queue...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-400 border border-dashed border-white/10 rounded-2xl">
          <Check className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-80" />
          <p className="font-medium text-slate-200">Review queue is empty</p>
          <p className="text-xs text-ink-muted mt-1">
            High-confidence tasks are automatically dispatched. Uncertain ones appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tasks.map((task) => {
              const isEditing = editingId === task.id;
              const isActing = actingId === task.id;

              return (
                <motion.div
                  key={task.id}
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 transition-all"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-amber-200 font-medium">Task Description</label>
                        <input
                          type="text"
                          value={editTask}
                          onChange={(e) => setEditTask(e.target.value)}
                          className="input-field w-full text-sm mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-amber-200 font-medium">Assignee</label>
                          <input
                            type="text"
                            value={editAssignee}
                            onChange={(e) => setEditAssignee(e.target.value)}
                            placeholder="e.g. Gaurav"
                            className="input-field w-full text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-amber-200 font-medium">Due Date</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="input-field w-full text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-ghost text-xs"
                          disabled={isActing}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditAndApprove(task)}
                          disabled={isActing}
                          className="btn-primary text-xs"
                        >
                          {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save &amp; Dispatch
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-100">{task.task}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {task.confidence}% Conf
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {task.priority || "medium"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <strong>{task.assignee || "Needs Assignee"}</strong>
                          </span>
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {task.due_date}
                            </span>
                          )}
                          {task.meeting_title && (
                            <span className="text-slate-400">
                              From: {task.meeting_title}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEditing(task)}
                          disabled={isActing}
                          className="btn-secondary !p-2 text-xs"
                          title="Edit task fields"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReject(task)}
                          disabled={isActing}
                          className="btn-danger !py-1.5 !px-3 text-xs"
                          title="Reject and discard"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(task)}
                          disabled={isActing}
                          className="btn-primary !py-1.5 !px-3 text-xs"
                          title="Approve and send email/Slack"
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
