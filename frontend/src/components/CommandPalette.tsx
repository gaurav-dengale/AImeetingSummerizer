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
} from "lucide-react";
import { paletteBackdrop, palettePanel } from "../lib/variants";

interface Action {
  id: string;
  label: string;
  hint: string;
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

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const actions: Action[] = useMemo(
    () => [
      { id: "overview", label: "Go to Overview", hint: "Live", icon: LayoutGrid, run: () => scrollTo("overview") },
      { id: "meet-bot", label: "Go to Meet Bot", hint: "Live", icon: Video, run: () => scrollTo("meet-bot") },
      { id: "mic", label: "Go to Microphone", hint: "Live", icon: Mic2, run: () => scrollTo("mic") },
      { id: "transcript", label: "Go to Transcript", hint: "Intelligence", icon: FileText, run: () => scrollTo("transcript") },
      { id: "tasks", label: "Go to Tasks", hint: "Intelligence", icon: ListChecks, run: () => scrollTo("tasks") },
      { id: "calendar", label: "Go to Scheduling", hint: "Intelligence", icon: CalendarClock, run: () => scrollTo("calendar") },
      { id: "dispatcher", label: "Go to Manual Dispatcher", hint: "Intelligence", icon: Send, run: () => scrollTo("dispatcher") },
      { id: "settings", label: "Go to Settings", hint: "Config", icon: Settings, run: () => scrollTo("settings") },
      {
        id: "authorize",
        label: "Authorize Google Calendar & Gmail",
        hint: "Action",
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

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = filtered[highlight];
        if (action) {
          action.run();
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, highlight, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
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
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a section or run an action..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted/60"
              />
              <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-ink-muted">esc</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-6">No matching actions.</p>
              ) : (
                filtered.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => {
                        action.run();
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        highlight === i ? "bg-white/10 text-white" : "text-ink-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{action.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-ink-muted/60">{action.hint}</span>
                      {highlight === i && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
