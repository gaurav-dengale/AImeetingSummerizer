import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Copy, CheckCheck, Mic, ChevronUp, ChevronDown } from "lucide-react";
import type { Segment } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";
import { toast } from "sonner";

interface Props {
  segments: Segment[];
}

// Deterministic speaker → color mapping
const SPEAKER_COLORS = [
  "text-sky-400 border-l-sky-400/60",
  "text-violet-400 border-l-violet-400/60",
  "text-emerald-400 border-l-emerald-400/60",
  "text-amber-400 border-l-amber-400/60",
  "text-rose-400 border-l-rose-400/60",
  "text-fuchsia-400 border-l-fuchsia-400/60",
];

function getSpeakerColor(speaker: string, map: Record<string, number>): string {
  if (!(speaker in map)) {
    const idx = Object.keys(map).length % SPEAKER_COLORS.length;
    map[speaker] = idx;
  }
  return SPEAKER_COLORS[map[speaker]];
}

export default function TranscriptFeed({ segments }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const speakerMap = useRef<Record<string, number>>({}).current;

  useEffect(() => {
    if (boxRef.current && !collapsed) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [segments, collapsed]);

  function copyTranscript() {
    const text = segments.map((s) => `${s.speaker || "Speaker"}: ${s.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Transcript copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Meeting Transcript Feed
        </h2>
        <div className="flex items-center gap-2">
          <span className="badge badge-info">{segments.length} segments</span>
          {segments.length > 0 && (
            <button
              onClick={copyTranscript}
              className="btn-secondary !py-1.5 !px-3 text-xs gap-1.5"
              title="Copy full transcript"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={boxRef}
              className="bg-black/40 border border-border rounded-xl p-4 max-h-72 overflow-y-auto font-mono text-sm leading-relaxed"
            >
              {segments.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Mic className="w-7 h-7 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-sans font-semibold text-sm">No transcript yet</p>
                    <p className="text-ink-muted font-sans text-xs mt-1 max-w-xs">
                      Join a meeting with the bot or record your microphone — live segments appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {segments.map((s, i) => {
                    const speaker = s.speaker || "Speaker";
                    const colorClasses = getSpeakerColor(speaker, speakerMap);
                    return (
                      <motion.div
                        key={i}
                        variants={listItem}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className={`mb-2.5 pb-2 border-b border-white/5 last:border-0 border-l-2 pl-3 ${colorClasses}`}
                      >
                        <span className={`font-semibold text-xs uppercase tracking-wide ${colorClasses.split(" ")[0]}`}>
                          {speaker}
                        </span>
                        <span className="text-slate-300 block mt-0.5">{s.text}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
