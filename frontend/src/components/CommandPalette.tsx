import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutGrid,
  Video,
  Mic2,
  FileText,
  ListChecks,
  CalendarClock,
  Settings,
  ShieldCheck,
  Send,
  CornerDownLeft,
  Mic,
  Radio,
  BarChart3,
  History,
  ArrowLeftRight,
  BellRing,
} from "lucide-react";
import { paletteBackdrop, palettePanel } from "../lib/variants";

interface Action {
  id: string;
  label: string;
  hint: string;
  category: "navigate" | "action" | "settings";
  icon: React.ElementType;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const CATEGORY_LABELS: Record<string, string> = {
  navigate: "Navigation",
  action: "Quick Actions",
  settings: "Settings",
};

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const actions: Action[] = useMemo(
    () => [
      // Navigation
      { id: "overview", label: "Go to Overview", hint: "Studio", category: "navigate", icon: LayoutGrid, run: () => scrollTo("overview") },
      { id: "meet-bot", label: "Go to Meet Bot", hint: "Studio", category: "navigate", icon: Video, run: () => scrollTo("meet-bot") },
      { id: "mic", label: "Go to Microphone", hint: "Studio", category: "navigate", icon: Mic2, run: () => scrollTo("mic") },
      { id: "transcript", label: "Go to Transcript", hint: "Studio", category: "navigate", icon: FileText, run: () => scrollTo("transcript") },
      { id: "tasks", label: "Go to Tasks", hint: "Studio", category: "navigate", icon: ListChecks, run: () => scrollTo("tasks") },
      { id: "calendar", label: "Go to Scheduling", hint: "Studio", category: "navigate", icon: CalendarClock, run: () => scrollTo("calendar") },
      { id: "decisions", label: "Go to Decision Ledger", hint: "Intelligence", category: "navigate", icon: ShieldCheck, run: () => scrollTo("decisions") },
      { id: "history", label: "Go to Meeting History", hint: "History", category: "navigate", icon: History, run: () => scrollTo("history") },
      { id: "analytics", label: "Go to Analytics", hint: "History", category: "navigate", icon: BarChart3, run: () => scrollTo("analytics") },
      { id: "sync", label: "Go to Bi-Directional Sync", hint: "Integrations", category: "navigate", icon: ArrowLeftRight, run: () => scrollTo("sync") },
      { id: "digests", label: "Go to Task Digests", hint: "Integrations", category: "navigate", icon: BellRing, run: () => scrollTo("digests") },
      { id: "dispatcher", label: "Go to Manual Dispatcher", hint: "Integrations", category: "navigate", icon: Send, run: () => scrollTo("dispatcher") },
      // Actions
      { id: "focus-mic", label: "Start Microphone Recording", hint: "Action", category: "action", icon: Mic, run: () => { scrollTo("mic"); } },
      { id: "focus-bot", label: "Launch Meet Bot", hint: "Action", category: "action", icon: Radio, run: () => { scrollTo("meet-bot"); } },
      // Settings
      { id: "settings", label: "Open Settings", hint: "Config", category: "settings", icon: Settings, run: () => scrollTo("settings") },
      {
        id: "authorize",
        label: "Authorize Google Calendar & Gmail",
        hint: "OAuth",
        category: "settings",
        icon: ShieldCheck,
        run: () => window.location.assign("/authorize_google"),
      },
    ],
    []
  );

  const filtered = useMemo(
    () => actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Action[]> = {};
    filtered.forEach((a) => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return groups;
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatFiltered = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    if (!open) { setQuery(""); setHighlight(0); }
  }, [open]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = flatFiltered[highlight];
        if (action) { action.run(); onClose(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, flatFiltered, highlight, onClose]);

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
          variants={paletteBackdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            variants={palettePanel}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border bg-surface backdrop-blur-2xl shadow-glow overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sections, actions, settings..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted/60"
              />
              <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-ink-muted">esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-6">No matching actions.</p>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted/50 px-3 py-1.5">
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                    {items.map((action) => {
                      const Icon = action.icon;
                      const currentIdx = flatIdx++;
                      const isHighlighted = highlight === currentIdx;
                      return (
                        <button
                          key={action.id}
                          onMouseEnter={() => setHighlight(currentIdx)}
                          onClick={() => { action.run(); onClose(); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                            isHighlighted ? "bg-white/10 text-white" : "text-ink-muted hover:text-white"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isHighlighted
                              ? category === "action" ? "bg-amber-500/20" : category === "settings" ? "bg-violet-500/20" : "bg-primary/20"
                              : "bg-white/5"
                          }`}>
                            <Icon className={`w-3.5 h-3.5 ${
                              isHighlighted
                                ? category === "action" ? "text-amber-400" : category === "settings" ? "text-violet-400" : "text-primary"
                                : ""
                            }`} />
                          </div>
                          <span className="flex-1 text-left">{action.label}</span>
                          <span className="text-[10px] uppercase tracking-wide text-ink-muted/50">{action.hint}</span>
                          {isHighlighted && <CornerDownLeft className="w-3.5 h-3.5 shrink-0 text-ink-muted" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-ink-muted/50">
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">↵</kbd> Select</span>
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">esc</kbd> Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
