import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText } from "lucide-react";
import type { Segment } from "../lib/api";
import { cardHover, cardTap, listItem } from "../lib/variants";

interface Props {
  segments: Segment[];
}

export default function TranscriptFeed({ segments }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [segments]);

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Meeting Transcript Feed
        </h2>
        <span className="badge badge-info">{segments.length} segments</span>
      </div>
      <div
        ref={boxRef}
        className="bg-black/40 border border-border rounded-xl p-4 h-60 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300"
      >
        {segments.length === 0 ? (
          <div className="text-slate-500 italic">
            No transcript captured yet. Join a meeting or record your microphone to begin...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {segments.map((s, i) => (
              <motion.div
                key={i}
                variants={listItem}
                initial="hidden"
                animate="show"
                exit="exit"
                className="mb-2.5 pb-2 border-b border-white/5 last:border-0"
              >
                <span className="font-semibold text-primary">{s.speaker || "Speaker"}:</span> {s.text}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
