import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AuroraBackground from "./components/layout/AuroraBackground";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import CommandPalette from "./components/CommandPalette";
import OverviewHero from "./components/OverviewHero";
import BotControlCard from "./components/BotControlCard";
import MicCard from "./components/MicCard";
import TranscriptFeed from "./components/TranscriptFeed";
import TasksCard from "./components/TasksCard";
import CalendarCard from "./components/CalendarCard";
import ManualDispatcherCard from "./components/ManualDispatcherCard";
import SettingsCard from "./components/SettingsCard";
import TaskReviewPanel from "./components/TaskReviewPanel";
import MeetingHistoryPage from "./components/MeetingHistoryPage";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DigestSettingsCard from "./components/DigestSettingsCard";
import { api, type AiResult, type Segment, type StatusResponse, type TranscriptResponse } from "./lib/api";
import { staggerContainer, tileIn } from "./lib/variants";

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [segments, setSegments] = useState<Segment[]>(() => {
    try {
      const saved = localStorage.getItem("meetingai_last_segments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [aiResult, setAiResult] = useState<AiResult | null>(() => {
    try {
      const saved = localStorage.getItem("meetingai_last_ai_result");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
      setStatusError(false);
      try {
        const rev = await api.getReviewCount();
        setPendingReviewCount(rev.pending_review ?? 0);
      } catch {
        // Ignored
      }
    } catch {
      setStatusError(true);
    }
  }, []);

  // Auto-restore latest meeting from database if local state is empty
  useEffect(() => {
    async function loadLatestMeeting() {
      try {
        const list = await api.listMeetings();
        if (list && list.length > 0) {
          const latestId = list[0].id;
          const detail = await api.getMeeting(latestId);
          if (detail && detail.raw_transcript) {
            const rawText = detail.raw_transcript;
            setSegments((prev) => {
              if (prev.length > 0) return prev;
              const restored: Segment[] = [{ speaker: "Meeting Audio", text: rawText }];
              try {
                localStorage.setItem("meetingai_last_segments", JSON.stringify(restored));
              } catch {}
              return restored;
            });
          }

          if (detail && detail.tasks) {
            setAiResult((prev) => {
              if (prev) return prev;
              const bullets = detail.summary_bullets && detail.summary_bullets.length > 0
                ? detail.summary_bullets
                : detail.summary ? [detail.summary] : [];
              const restoredAi: AiResult = {
                summary: detail.summary || "",
                summary_bullets: bullets,
                tasks: detail.tasks.map((t) => ({
                  assignee: t.assignee || "",
                  task: t.task || "",
                  due_date: t.due_date || "",
                  confidence: t.confidence || 80,
                  priority: t.priority || "medium",
                })),

                total_segments: 1,
                total_tasks: detail.tasks.length,
              };
              try {
                localStorage.setItem("meetingai_last_ai_result", JSON.stringify(restoredAi));
              } catch {}
              return restoredAi;
            });
          }
        }
      } catch {
        // Ignored
      }
    }
    loadLatestMeeting();
  }, []);

  useEffect(() => {
    refreshStatus();
    const id = window.setInterval(refreshStatus, 15000);
    return () => window.clearInterval(id);
  }, [refreshStatus]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function applyResult(data: TranscriptResponse) {
    if (data.transcript?.segments) {
      setSegments(data.transcript.segments);
      try {
        localStorage.setItem("meetingai_last_segments", JSON.stringify(data.transcript.segments));
      } catch {}
    }
    const result = data.processing_results ?? data.ai_result;
    if (result) {
      setAiResult(result);
      try {
        localStorage.setItem("meetingai_last_ai_result", JSON.stringify(result));
      } catch {}
    }
    if (typeof data.pending_review_count === "number") {
      setPendingReviewCount(data.pending_review_count);
    }
  }

  function applyLiveSegments(live: Segment[]) {
    setSegments(live);
  }


  return (
    <div className="flex min-h-screen">
      <AuroraBackground />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="flex-1 min-w-0">
        <Topbar status={status} statusError={statusError} />

        <motion.main
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-12 gap-6"
        >
          {/* Overview Hero & Summary */}
          <motion.section id="overview" variants={tileIn} className="col-span-12 scroll-mt-24">
            <OverviewHero
              status={status}
              segments={segments}
              aiResult={aiResult}
              pendingReviewCount={pendingReviewCount}
            />
          </motion.section>

          {/* Meeting Bot Card */}
          <motion.div id="meet-bot" variants={tileIn} className="col-span-12 lg:col-span-7 scroll-mt-24">
            <BotControlCard onResult={applyResult} />
          </motion.div>

          {/* Mic Card */}
          <motion.div id="mic" variants={tileIn} className="col-span-12 lg:col-span-5 scroll-mt-24">
            <MicCard onLiveSegments={applyLiveSegments} onResult={applyResult} />
          </motion.div>

          {/* Human-in-the-Loop Review Queue (#8, #12) */}
          <motion.section id="review" variants={tileIn} className="col-span-12 scroll-mt-24">
            <TaskReviewPanel onTasksChanged={refreshStatus} />
          </motion.section>

          {/* Live Transcript Feed */}
          <motion.section id="transcript" variants={tileIn} className="col-span-12 scroll-mt-24">
            <TranscriptFeed segments={segments} />
          </motion.section>

          {/* Tasks Card with Status Toggle & Retries (#2, #3, #12, #14) */}
          <motion.div id="tasks" variants={tileIn} className="col-span-12 lg:col-span-8 scroll-mt-24">
            <TasksCard tasks={aiResult?.tasks ?? []} onTaskUpdated={refreshStatus} />
          </motion.div>

          {/* Calendar Card */}
          <motion.div id="calendar" variants={tileIn} className="col-span-12 lg:col-span-4 scroll-mt-24">
            <CalendarCard event={aiResult?.scheduled_event} />
          </motion.div>

          {/* Manual Dispatcher */}
          <motion.div id="dispatcher" variants={tileIn} className="col-span-12 lg:col-span-6 scroll-mt-24">
            <ManualDispatcherCard />
          </motion.div>

          {/* Recurring Task Digest (#6) */}
          <motion.div id="digests" variants={tileIn} className="col-span-12 lg:col-span-6 scroll-mt-24">
            <DigestSettingsCard />
          </motion.div>

          {/* Persistent Meeting History (#1) */}
          <motion.section id="history" variants={tileIn} className="col-span-12 scroll-mt-24">
            <MeetingHistoryPage />
          </motion.section>

          {/* Analytics Dashboard (#11) */}
          <motion.section id="analytics" variants={tileIn} className="col-span-12 scroll-mt-24">
            <AnalyticsDashboard />
          </motion.section>

          {/* Settings */}
          <motion.section id="settings" variants={tileIn} className="col-span-12 scroll-mt-24">
            <SettingsCard vexaBaseUrl={status?.vexaBaseUrl} onSaved={refreshStatus} />
          </motion.section>
        </motion.main>
      </div>
    </div>
  );
}

