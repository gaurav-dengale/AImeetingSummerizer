import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  LayoutGrid,
  Video,
  Mic2,
  FileText,
  ListChecks,
  CalendarClock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  Send,
  ShieldAlert,
  History,
  BarChart3,
  BellRing,
  ArrowLeftRight,
  ShieldCheck,
  GitCommit,
  Sparkles,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Live Capture",
    items: [
      { id: "overview", label: "Overview", icon: LayoutGrid },
      { id: "meet-bot", label: "Meet Bot", icon: Video },
      { id: "mic", label: "Microphone", icon: Mic2 },
    ],
  },
  {
    heading: "Intelligence & Review",
    items: [
      { id: "decisions", label: "Decision Ledger", icon: ShieldCheck },
      { id: "conflicts", label: "Constraint Graph", icon: GitCommit },
      { id: "review", label: "Review Queue", icon: ShieldAlert },
      { id: "transcript", label: "Transcript", icon: FileText },
      { id: "tasks", label: "Active Tasks", icon: ListChecks },
      { id: "calendar", label: "Scheduling", icon: CalendarClock },
      { id: "dispatcher", label: "Manual Dispatch", icon: Send },
    ],
  },
  {
    heading: "Management & Sync",
    items: [
      { id: "sync", label: "Bi-Directional Sync", icon: ArrowLeftRight },
      { id: "history", label: "Meeting History", icon: History },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "digests", label: "Task Digests", icon: BellRing },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenPalette: () => void;
  onOpenAskAi?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
}

const ID_TO_TAB: Record<string, "studio" | "intelligence" | "history" | "integrations"> = {
  overview: "studio",
  "meet-bot": "studio",
  mic: "studio",
  transcript: "studio",
  tasks: "studio",
  calendar: "studio",
  decisions: "intelligence",
  conflicts: "intelligence",
  review: "intelligence",
  history: "history",
  analytics: "history",
  dispatcher: "integrations",
  digests: "integrations",
  sync: "integrations",
  settings: "integrations",
};

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  onOpenPalette,
  onOpenAskAi,
  activeTab,
  onSelectTab,
}: Props) {
  const [active, setActive] = useState(ALL_IDS[0]);

  function goTo(id: string) {
    const targetTab = ID_TO_TAB[id];
    if (targetTab && onSelectTab && activeTab !== "all" && activeTab !== targetTab) {
      onSelectTab(targetTab);
    }
    setActive(id);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-black/20 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-white" strokeWidth={2.4} />
        </div>
        {!collapsed && (
          <span className="font-extrabold text-sm tracking-tight whitespace-nowrap overflow-hidden">
            VexaMeet
          </span>
        )}
      </div>

      <button
        onClick={onOpenPalette}
        className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-border text-ink-muted text-xs hover:bg-white/10 hover:text-ink-main transition-colors"
      >
        <Command className="w-3.5 h-3.5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Quick actions</span>
            <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
          </>
        )}
      </button>

      {onOpenAskAi && (
        <button
          onClick={onOpenAskAi}
          className="mx-3 mt-1.5 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 border border-brand-purple/40 text-white text-xs hover:brightness-110 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-purple shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left font-medium">Ask AI Memory</span>
              <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.2 rounded text-emerald-400">RAG</span>
            </>
          )}
        </button>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted/60 px-2.5 mb-1.5">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? "text-white" : "text-ink-muted hover:text-ink-main hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon className="w-4 h-4 shrink-0 relative z-10" />
                    {!collapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggleCollapsed}
        className="flex items-center gap-2.5 px-4 py-3.5 border-t border-border text-ink-muted hover:text-ink-main transition-colors text-xs"
      >
        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        {!collapsed && "Collapse"}
      </button>
    </motion.aside>
  );
}
