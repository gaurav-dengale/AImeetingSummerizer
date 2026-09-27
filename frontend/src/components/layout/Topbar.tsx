import { CalendarCheck, Cpu, HelpCircle, Menu, MessageSquare, Users, Wifi, WifiOff } from "lucide-react";
import type { StatusResponse } from "../../lib/api";
import { usePulseOnChange } from "../../lib/usePulse";

interface Props {
  status: StatusResponse | null;
  statusError: boolean;
  onOpenTour?: () => void;
  onToggleMobileSidebar?: () => void;
}

export default function Topbar({ status, statusError, onOpenTour, onToggleMobileSidebar }: Props) {
  const aiUp = status?.aiServiceHealth?.status === "UP";
  const contactsCount = status?.contactsCount ?? 0;

  const backendScope = usePulseOnChange(statusError);
  const aiScope = usePulseOnChange(aiUp);
  const slackScope = usePulseOnChange(status?.slackConfigured ?? false);
  const googleScope = usePulseOnChange(status?.googleConfigured ?? false);
  const contactsScope = usePulseOnChange(contactsCount);

  return (
    <header className="sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5 sm:py-0 md:h-16 border-b border-border bg-base/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 -ml-1 rounded-xl text-ink-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold leading-none truncate">VexaMeet AI Assistant</h1>
            <p className="text-ink-muted text-[10px] sm:text-xs mt-0.5 truncate">Spring Boot :8080 &middot; FastAPI AI engine :5001</p>
          </div>
        </div>

        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="md:hidden flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.06] border border-border text-ink-muted hover:text-white shrink-0"
            title="Open Getting Started tour"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Tour</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-full">
        <span ref={backendScope} className={`badge text-[11px] sm:text-xs shrink-0 transition-colors duration-300 ${statusError ? "badge-warn" : "badge-active"}`}>
          {statusError ? <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          Backend
        </span>
        <span ref={aiScope} className={`badge text-[11px] sm:text-xs shrink-0 transition-colors duration-300 ${aiUp ? "badge-active" : "badge-warn"}`}>
          <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          AI Engine
        </span>
        <span ref={slackScope} className={`badge text-[11px] sm:text-xs shrink-0 transition-colors duration-300 ${status?.slackConfigured ? "badge-active" : "badge-warn"}`}>
          <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Slack
        </span>
        <span ref={googleScope} className={`badge text-[11px] sm:text-xs shrink-0 transition-colors duration-300 ${status?.googleConfigured ? "badge-active" : "badge-warn"}`}>
          <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Google
        </span>
        <span ref={contactsScope} className="badge badge-info text-[11px] sm:text-xs shrink-0">
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          {contactsCount} Contacts
        </span>

        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.06] border border-border text-ink-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Open Getting Started tour"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Tour
          </button>
        )}
      </div>
    </header>
  );
}
