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
  Loader2,
  RefreshCw
} from "lucide-react";
import { api, type AnalyticsData } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";

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
        <div className="glass-card py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-sm">Calculating intelligence metrics...</p>
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

          {/* Top Assignees Leaderboard */}
          <div className="glass-card col-span-12 lg:col-span-8 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team Task Distribution &amp; Completion
              </h3>
              <span className="text-xs text-ink-muted">Sorted by task volume</span>
            </div>

            {!data?.top_assignees || data.top_assignees.length === 0 ? (
              <div className="text-center py-10 text-slate-500 italic text-sm">
                No team assignments tracked yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.top_assignees.map((person, idx) => {
                  const rate = person.total > 0 ? Math.round((person.done * 100) / person.total) : 0;
                  return (
                    <div
                      key={person.assignee || idx}
                      className="bg-slate-800/40 border border-white/[0.04] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                          {person.assignee?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{person.assignee || "Unassigned"}</p>
                          <p className="text-[11px] text-ink-muted">{person.total} total assigned</p>
                        </div>
                      </div>

                      <div className="flex-1 max-w-xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-ink-muted">Completion</span>
                          <span className="font-semibold text-slate-200">{rate}% ({person.done}/{person.total})</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
