import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCommit,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  Zap,
} from "lucide-react";
import { api, type TaskConflict } from "../lib/api";

export default function TemporalConflictCard() {
  const [conflicts, setConflicts] = useState<TaskConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const data = await api.getConflicts();
      setConflicts(data || []);
    } catch (err) {
      console.error("Failed to load cross-meeting conflicts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleResolve = async (conflict: TaskConflict) => {
    setResolvingId(conflict.conflictId);
    try {
      const targetId = conflict.suggestedRebalance.target_task_id;
      const newDate = conflict.suggestedRebalance.recommended_due_date;
      const res = await api.resolveConflict(targetId, newDate);

      setSuccessMessage(res.message || "Conflict successfully resolved and timeline rebalanced!");
      setConflicts(res.remaining_conflicts || []);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Error resolving conflict:", err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section id="conflicts" className="relative group">
      <div className="card-glass border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl bg-gradient-to-b from-amber-500/[0.03] to-transparent">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Cross-Meeting Temporal Constraint Graph
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DAG Conflict Solver
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Multi-session deadline collision detection and automated resource bandwidth arbitration.
              </p>
            </div>
          </div>

          <button
            onClick={fetchConflicts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ink-main transition-colors w-fit"
            title="Scan for cross-meeting collisions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Scan Constraint Graph</span>
          </button>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conflicts List */}
        {loading && conflicts.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            Calculating cross-meeting DAG constraints...
          </div>
        ) : conflicts.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-border/60 bg-white/[0.01] mt-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-xs font-medium text-ink-main">
              Zero Temporal Collisions Detected
            </p>
            <p className="text-[11px] text-ink-muted/60 mt-1">
              All commitments across your past meetings are within safe capacity limits and have non-conflicting delivery timelines.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {conflicts.map((c, index) => {
              return (
                <motion.div
                  key={c.conflictId || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.02] p-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                          <AlertOctagon className="w-3 h-3" />
                          {c.severity.toUpperCase()} COLLISION
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-ink-muted flex items-center gap-1">
                          <User className="w-3 h-3 text-ink-muted" />
                          Assignee: <strong className="text-white">{c.assignee}</strong>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                          Conflict Score: {c.conflictScore}/100
                        </span>
                      </div>

                      <p className="text-xs text-white font-medium mt-1">
                        {c.reason}
                      </p>
                    </div>

                    {/* Conflict Badge */}
                    <div className="shrink-0">
                      <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="text-xs font-mono font-bold text-amber-400 block">
                          {c.conflictScore}%
                        </span>
                        <span className="text-[9px] text-ink-muted uppercase tracking-wider block">
                          Collision
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conflicting Tasks Sub-grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-500/10">
                    {c.involvedTasks.map((task, tIdx) => (
                      <div
                        key={task.id || tIdx}
                        className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-ink-muted/80 mb-1">
                          <span className="truncate max-w-[140px] font-medium text-ink-main">
                            📁 {task.meeting_title || "Meeting"}
                          </span>
                          <span className="font-mono text-amber-400/90 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {task.due_date || "No deadline"}
                          </span>
                        </div>
                        <p className="text-white text-xs line-clamp-2 leading-relaxed">
                          {task.task}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* AI Autonomous Rebalance Suggestion */}
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-brand-purple/10 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-300 flex items-center gap-1.5 flex-wrap">
                          <span>Autonomous Rebalance:</span>
                          <span className="line-through text-ink-muted/70 text-[11px]">
                            {c.suggestedRebalance.current_due_date || "Current"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                          <span className="text-emerald-400 font-mono">
                            {c.suggestedRebalance.recommended_due_date}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          {c.suggestedRebalance.rationale}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolve(c)}
                      disabled={resolvingId === c.conflictId}
                      className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
                    >
                      {resolvingId === c.conflictId ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Apply Rebalance</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
