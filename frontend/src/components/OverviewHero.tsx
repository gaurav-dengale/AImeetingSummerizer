import { motion } from "framer-motion";
import { Sparkles, FileText, ListChecks, Users, ShieldAlert } from "lucide-react";
import type { AiResult, Segment, StatusResponse } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";

interface Props {
  status: StatusResponse | null;
  segments: Segment[];
  aiResult: AiResult | null;
  pendingReviewCount?: number;
}

export default function OverviewHero({ status, segments, aiResult, pendingReviewCount = 0 }: Props) {
  const taskCount = aiResult?.tasks?.length ?? 0;
  const sentCount = aiResult?.tasks?.filter((t) => t.email_sent || t.slack_sent).length ?? 0;
  const summaryBullets = aiResult?.summary_bullets || (aiResult?.summary ? aiResult.summary.split("\n").filter(Boolean) : []);

  const stats = [
    { label: "Transcript segments", value: segments.length, icon: FileText },
    { label: "Tasks extracted", value: taskCount, icon: ListChecks, sub: `${sentCount} dispatched` },
    { label: "Pending review", value: pendingReviewCount, icon: ShieldAlert, sub: pendingReviewCount > 0 ? "Requires review" : "Clear" },
    { label: "Contacts loaded", value: status?.contactsCount ?? 0, icon: Users },
  ];

  return (
    <motion.div
      whileHover={cardHover}
      whileTap={cardTap}
      className="glass-card col-span-12 relative overflow-hidden space-y-6"
    >
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-gradient opacity-20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="badge badge-info mb-3">
            <Sparkles className="w-3.5 h-3.5" /> AI Command Center
          </span>
          <h2 className="text-2xl font-extrabold mb-1.5">Every meeting, handled automatically</h2>
          <p className="text-ink-muted text-sm max-w-md">
            Join a meeting or record your mic — Groq extracts tasks with confidence &amp; sentiment scores, dispatches notifications, and saves history to PostgreSQL.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl bg-black/25 border border-border px-4 py-3 min-w-[130px]"
              >
                <Icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-[11px] text-ink-muted mt-1.5 leading-tight">{s.label}</p>
                {s.sub && <p className="text-[10px] text-emerald-400 mt-0.5">{s.sub}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Generated Summary Bullets (#4) */}
      {summaryBullets.length > 0 && (
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Key Meeting Takeaways &amp; Executive Summary
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {summaryBullets.map((bullet, i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-white/[0.04] rounded-xl p-3 text-xs text-slate-200 flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{bullet.replace(/^[•\-\*]\s*/, "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

