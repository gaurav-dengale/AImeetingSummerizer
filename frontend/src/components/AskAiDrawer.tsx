import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Quote,
  CheckCircle,
  HelpCircle,
  BrainCircuit,
  RefreshCw,
} from "lucide-react";
import { api, type AskAiResponse } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meetingId?: number;
}

export default function AskAiDrawer({ isOpen, onClose, meetingId }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskAiResponse | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; response: AskAiResponse }>>([]);

  const handleAsk = async (userQuery?: string) => {
    const q = userQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.askMeetingAi(q, meetingId);
      setResponse(res);
      setHistory((prev) => [{ query: q, response: res }, ...prev]);
      if (!userQuery) setQuery("");
    } catch (err) {
      console.error("Ask AI error:", err);
    } finally {
      setLoading(false);
    }
  };

  const presetQueries = [
    "What key architectural decisions were made?",
    "Who is responsible for the database schema migration?",
    "What are the critical blockers or deadlines discussed?",
    "What security protocols did we agree on?",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#0B0D13] border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
                  <BrainCircuit className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Ask Meeting AI Memory
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                      RAG Q&A
                    </span>
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Grounded answers with transcript citations & action items.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Preset suggestion chips */}
              <div>
                <span className="text-[11px] font-medium text-ink-muted/80 flex items-center gap-1.5 mb-2">
                  <HelpCircle className="w-3.5 h-3.5" /> Suggested Queries
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetQueries.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAsk(preset)}
                      disabled={loading}
                      className="text-left text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-ink-main/90 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active response */}
              {loading ? (
                <div className="p-8 text-center text-xs text-ink-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  Synthesizing grounded answer across transcripts...
                </div>
              ) : response ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Grounded Answer
                    </span>
                    {response.confidence && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {response.confidence}% Confidence
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white leading-relaxed whitespace-pre-line">
                    {response.answer}
                  </p>

                  {/* Key Citations */}
                  {response.key_citations && response.key_citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                        Transcript Citations
                      </span>
                      {response.key_citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs text-ink-muted"
                        >
                          <div className="flex items-center gap-1.5 text-white font-medium text-[11px] mb-1">
                            <Quote className="w-3 h-3 text-amber-400" />
                            <span>{c.speaker}</span>
                          </div>
                          <p className="italic text-ink-main/90">"{c.quote}"</p>
                          {c.relevance && (
                            <p className="text-[10px] text-ink-muted/70 mt-1">{c.relevance}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Related Action Items */}
                  {response.related_action_items && response.related_action_items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                        Related Action Items
                      </span>
                      {response.related_action_items.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="text-xs text-white flex items-center gap-1.5 py-0.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : null}

              {/* Previous query history */}
              {history.length > 1 && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                    Recent Queries
                  </span>
                  {history.slice(1).map((h, hIdx) => (
                    <div
                      key={hIdx}
                      className="p-3 rounded-lg bg-white/[0.01] border border-white/5 text-xs"
                    >
                      <span className="font-semibold text-white block mb-1">Q: {h.query}</span>
                      <p className="text-ink-muted line-clamp-2">{h.response.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Input */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask anything about meetings, tasks, or decisions..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-ink-muted/50 focus:outline-none focus:border-brand-purple/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
