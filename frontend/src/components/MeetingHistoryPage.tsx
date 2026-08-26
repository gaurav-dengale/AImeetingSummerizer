import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Calendar,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ListChecks,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Circle,
  Mic,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type MeetingSummaryItem, type MeetingDetail } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";

const INITIAL_VISIBLE_COUNT = 4;

export default function MeetingHistoryPage() {
  const [meetings, setMeetings] = useState<MeetingSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState<MeetingDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listMeetings();
      setMeetings(data || []);
    } catch {
      // Backend warming up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  async function openMeeting(id: number) {
    setSelectedMeetingId(id);
    setLoadingDetail(true);
    try {
      const detail = await api.getMeeting(id);
      setSelectedMeetingDetail(detail);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load meeting detail");
      setSelectedMeetingId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function deleteMeeting(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this meeting history and its tasks?")) return;
    setDeletingId(id);
    try {
      await api.deleteMeeting(id);
      toast.success("Meeting record removed");
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (selectedMeetingId === id) {
        setSelectedMeetingId(null);
        setSelectedMeetingDetail(null);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete meeting");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleDetailTask(taskId?: number, currentStatus?: string) {
    if (!taskId) return;
    const next = currentStatus === "done" ? "pending" : "done";
    try {
      await api.updateTaskStatus(taskId, next);
      setSelectedMeetingDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: next } : t)),
        };
      });
      fetchMeetings();
      toast.success(`Task marked as ${next}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Persistent Meeting History
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            PostgreSQL-backed meeting log with auto-generated summaries, extracted action items, and task tracking.
          </p>
        </div>
        <button
          onClick={fetchMeetings}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Meetings List */}
        <div className={`col-span-12 ${selectedMeetingId ? "lg:col-span-6" : "lg:col-span-12"} transition-all`}>
          {loading ? (
            <div className="glass-card py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading meeting history from PostgreSQL...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="glass-card py-16 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-200">No meeting history yet</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                Join a meeting via Vexa bot or record your microphone to automatically persist transcripts, summaries, and action items.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {(showAll ? meetings : meetings.slice(0, INITIAL_VISIBLE_COUNT)).map((m) => {
                  const isSelected = selectedMeetingId === m.id;
                  const dateStr = new Date(m.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <motion.div
                      key={m.id}
                      layout
                      variants={listItem}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      whileHover={cardHover}
                      whileTap={cardTap}
                      onClick={() => openMeeting(m.id)}
                      className={`glass-card p-5 cursor-pointer transition-all border ${
                        isSelected
                          ? "border-primary/60 bg-primary/10"
                          : "border-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`p-1.5 rounded-lg text-xs ${
                                m.source === "local"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {m.source === "local" ? <Mic className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </span>
                            <h3 className="font-bold text-sm text-slate-100 truncate">{m.title}</h3>
                          </div>

                          {m.summary && (
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/[0.04]">
                              {m.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {dateStr}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ListChecks className="w-3 h-3 text-slate-400" />
                              {m.task_count} tasks ({m.done_count} done)
                            </span>
                            {m.segment_count > 0 && (
                              <>
                                <span>•</span>
                                <span>{m.segment_count} segments</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-center">
                          <button
                            onClick={(e) => deleteMeeting(m.id, e)}
                            disabled={deletingId === m.id}
                            className="btn-ghost !p-2 text-rose-400 hover:bg-rose-900/20"
                            title="Delete meeting"
                          >
                            {deletingId === m.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-1 text-primary" : ""}`} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* See More / Show Less Button */}
              {meetings.length > INITIAL_VISIBLE_COUNT && (
                <div className="pt-2 flex items-center justify-center">
                  <button
                    onClick={() => setShowAll((prev) => !prev)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-primary" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-primary" />
                        <span>See More ({meetings.length - INITIAL_VISIBLE_COUNT} more meetings)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meeting Detail Drawer */}
        {selectedMeetingId && (
          <div className="col-span-12 lg:col-span-6">
            <div className="glass-card p-6 sticky top-24 space-y-6">
              {loadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-xs">Loading meeting details...</p>
                </div>
              ) : selectedMeetingDetail ? (
                <>
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{selectedMeetingDetail.title}</h3>
                      <p className="text-xs text-ink-muted mt-1">
                        ID: {selectedMeetingDetail.meeting_id} • {selectedMeetingDetail.source}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeetingId(null);
                        setSelectedMeetingDetail(null);
                      }}
                      className="btn-ghost text-xs !py-1 !px-2"
                    >
                      Close
                    </button>
                  </div>

                  {/* Summary Section (#4 Auto-generated summary) */}
                  {selectedMeetingDetail.summary && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" /> AI Summary
                      </div>
                      <div className="bg-slate-900/50 border border-white/[0.06] rounded-2xl p-4 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                        {selectedMeetingDetail.summary}
                      </div>
                    </div>
                  )}

                  {/* Tasks Section (#2 Task status tracking) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                        <ListChecks className="w-3.5 h-3.5 text-primary" /> Action Items ({selectedMeetingDetail.tasks?.length ?? 0})
                      </div>
                    </div>

                    {selectedMeetingDetail.tasks?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No tasks recorded for this meeting.</p>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {selectedMeetingDetail.tasks?.map((t) => {
                          const isDone = t.status === "done";
                          return (
                            <div
                              key={t.id}
                              className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 text-xs ${
                                isDone
                                  ? "bg-slate-900/30 border-emerald-500/20 text-slate-400"
                                  : "bg-slate-800/40 border-white/[0.06] text-slate-200"
                              }`}
                            >
                              <button
                                onClick={() => toggleDetailTask(t.id, t.status)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                                )}
                              </button>
                              <div className="flex-1 space-y-1">
                                <p className={`font-medium ${isDone ? "line-through" : ""}`}>{t.task}</p>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-muted">
                                  <span>Assignee: <strong>{t.assignee || "—"}</strong></span>
                                  {t.due_date && <span>Due: {t.due_date}</span>}
                                  {t.priority && (
                                    <span className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                      {t.priority}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
