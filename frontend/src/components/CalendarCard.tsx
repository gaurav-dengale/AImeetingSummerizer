import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ExternalLink } from "lucide-react";
import type { ScheduledEvent } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { cardHover, cardTap, popIn } from "../lib/variants";

interface Props {
  event: ScheduledEvent | null | undefined;
}

export default function CalendarCard({ event }: Props) {
  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-primary" /> Follow-up Scheduling
      </h2>

      <AnimatePresence mode="wait">
        {!event ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-slate-500 italic text-sm"
          >
            No upcoming follow-up sync detected in speech.
          </motion.div>
        ) : (
          <motion.div
            key="event"
            variants={popIn}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-gradient-to-br from-primary/10 to-indigo/10 border border-primary/25 rounded-2xl p-5"
          >
            <h3 className="text-base font-bold text-sky-300 mb-2">
              {event.event_title || "Meeting Sync"}
            </h3>
            <p className="text-xs text-ink-muted mb-2">
              {formatDateTime(event.start_time)} &rarr; {formatDateTime(event.end_time)}
            </p>
            {event.notes && <p className="text-xs text-slate-300 mb-3">{event.notes}</p>}
            {event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-300 text-sm font-medium hover:underline"
              >
                Open in Google Calendar <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <p className="text-xs text-amber-400">
                Not yet created — authorize Google in Settings below.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
