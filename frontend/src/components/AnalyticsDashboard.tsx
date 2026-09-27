import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ShieldAlert,
  RefreshCw
} from "lucide-react";
import { api, type AnalyticsData } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";
import { SkeletonKpiGrid, SkeletonText } from "./Skeleton";

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      setData(res);
    } catch {
      // Backend warming up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totalTasks = data?.total_tasks ?? 0;
  const doneTasks = data?.done_tasks ?? 0;
  const pendingTasks = Math.max(0, totalTasks - doneTasks);
  const completionRate = data?.completion_rate ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Meeting Intelligence &amp; Analytics
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Real-time execution metrics, team task completion rates, and dispatch performance.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonKpiGrid count={4} />
          <div className="glass-card p-6 space-y-4">
            <SkeletonText lines={1} className="w-1/4" />
            <SkeletonText lines={3} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Key KPI Cards */}
          <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card col-span-12 sm:col-span-6 lg:col-span-3 p-5">
            <div className="flex items-center justify-between text-ink-muted mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-slate-100">{completionRate}%</div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, completionRate)}%` }}
              />
            </div>
          </motion.div>

          <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card col-span-12 sm:col-span-6 lg:col-span-3 p-5">
            <div className="flex items-center justify-between text-ink-muted mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Action Items Done</span>
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-slate-100">
              {doneTasks} <span className="text-sm font-normal text-slate-400">/ {totalTasks}</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-2">{pendingTasks} active tasks pending</p>
          </motion.div>

          <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card col-span-12 sm:col-span-6 lg:col-span-3 p-5">
            <div className="flex items-center justify-between text-ink-muted mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Meetings</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-slate-100">{data?.total_meetings ?? 0}</div>
            <p className="text-[11px] text-ink-muted mt-2">Recorded &amp; transcribed</p>
          </motion.div>

          <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card col-span-12 sm:col-span-6 lg:col-span-3 p-5">
            <div className="flex items-center justify-between text-ink-muted mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-slate-100">{data?.pending_review ?? 0}</div>
            <p className="text-[11px] text-ink-muted mt-2">Awaiting human sign-off</p>
          </motion.div>

          {/* Top Assignees — animated SVG bar chart + leaderboard */}
          <div className="glass-card col-span-12 lg:col-span-8 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team Task Distribution
              </h3>
              <span className="text-xs text-ink-muted">Sorted by task volume</span>
            </div>

            {!data?.top_assignees || data.top_assignees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary/40" />
                </div>
                <div>
                  <p className="text-slate-300 font-semibold text-sm">No team data yet</p>
                  <p className="text-ink-muted text-xs mt-1">Run your first meeting to see assignee analytics.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* SVG Bar Chart */}
                <div className="flex items-end gap-2 h-28 px-1">
                  {data.top_assignees.slice(0, 8).map((person, idx) => {
                    const maxTotal = Math.max(...data.top_assignees.map((p) => p.total), 1);
                    const totalPct = (person.total / maxTotal) * 100;
                    const donePct = person.total > 0 ? (person.done / person.total) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full relative flex items-end rounded-t-lg overflow-hidden" style={{ height: "80px" }}>
                          {/* Background bar */}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-slate-800/80 rounded-t-lg"
                            initial={{ height: 0 }}
                            animate={{ height: `${totalPct}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
                          />
                          {/* Done overlay */}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-primary/50 rounded-t-lg"
                            initial={{ height: 0 }}
                            animate={{ height: `${(totalPct * donePct) / 100}%` }}
                            transition={{ duration: 0.7, delay: idx * 0.05 + 0.2, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-[9px] text-ink-muted truncate w-full text-center">
                          {person.assignee?.split(" ")[0] ?? "?"}
                        </p>
                        <p className="text-[9px] font-bold text-slate-300">{person.total}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-[10px] text-ink-muted">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />Total</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary/50" />Completed</span>
                </div>
                {/* Leaderboard */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  {data.top_assignees.map((person, idx) => {
                    const rate = person.total > 0 ? Math.round((person.done * 100) / person.total) : 0;
                    return (
                      <div key={person.assignee || idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                          {person.assignee?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <p className="text-xs font-semibold text-slate-200 w-24 truncate shrink-0">{person.assignee || "Unassigned"}</p>
                        <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className="bg-primary h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${rate}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.06 }}
                          />
                        </div>
                        <span className="text-[10px] text-ink-muted shrink-0">{rate}% ({person.done}/{person.total})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Automation Health */}
          <div className="glass-card col-span-12 lg:col-span-4 p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Pipeline Efficiency
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Meetings are automatically parsed by Groq LLMs into structured JSON. Tasks above 80% confidence bypass manual review and dispatch immediately.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                <span className="text-slate-300">Auto-Dispatch Threshold</span>
                <strong className="text-emerald-400">&ge; 80% Conf</strong>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                <span className="text-slate-300">Persistence Engine</span>
                <strong className="text-purple-400">PostgreSQL (JPA)</strong>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                <span className="text-slate-300">AI Intelligence</span>
                <strong className="text-primary">Groq LLaMA 3.3 70B</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
