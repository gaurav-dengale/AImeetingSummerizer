import { CalendarCheck, Cpu, MessageSquare, Users, Wifi, WifiOff } from "lucide-react";
import type { StatusResponse } from "../../lib/api";
import { usePulseOnChange } from "../../lib/usePulse";

interface Props {
  status: StatusResponse | null;
  statusError: boolean;
}

export default function Topbar({ status, statusError }: Props) {
  const aiUp = status?.aiServiceHealth?.status === "UP";
  const contactsCount = status?.contactsCount ?? 0;

  const backendScope = usePulseOnChange(statusError);
  const aiScope = usePulseOnChange(aiUp);
  const slackScope = usePulseOnChange(status?.slackConfigured ?? false);
  const googleScope = usePulseOnChange(status?.googleConfigured ?? false);
  const contactsScope = usePulseOnChange(contactsCount);

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 h-16 border-b border-border bg-base/70 backdrop-blur-xl">
      <div>
        <h1 className="text-lg font-bold leading-none">VexaMeet AI Assistant</h1>
        <p className="text-ink-muted text-xs mt-1">Spring Boot :8080 &middot; FastAPI AI engine :5001</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <span ref={backendScope} className={`badge transition-colors duration-300 ${statusError ? "badge-warn" : "badge-active"}`}>
          {statusError ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          Backend
        </span>
        <span ref={aiScope} className={`badge transition-colors duration-300 ${aiUp ? "badge-active" : "badge-warn"}`}>
          <Cpu className="w-3.5 h-3.5" />
          AI Engine
        </span>
        <span ref={slackScope} className={`badge transition-colors duration-300 ${status?.slackConfigured ? "badge-active" : "badge-warn"}`}>
          <MessageSquare className="w-3.5 h-3.5" />
          Slack
        </span>
        <span ref={googleScope} className={`badge transition-colors duration-300 ${status?.googleConfigured ? "badge-active" : "badge-warn"}`}>
          <CalendarCheck className="w-3.5 h-3.5" />
          Google
        </span>
        <span ref={contactsScope} className="badge badge-info">
          <Users className="w-3.5 h-3.5" />
          {contactsCount} Contacts
        </span>
      </div>
    </div>
  );
}
