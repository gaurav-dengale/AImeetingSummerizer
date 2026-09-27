import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, CheckCircle2, Circle, ArrowRight, ArrowLeft,
  Mic, Video, CalendarCheck, Users, Zap, ChevronRight
} from "lucide-react";

interface Props {
  onClose: () => void;
  onGoToSettings: () => void;
}

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/15 border-amber-400/30",
    title: "Welcome to MeetIQ 👋",
    subtitle: "AI-Powered Meeting Summarizer & Smart Scheduler",
    description:
      "MeetIQ automatically transcribes your meetings, extracts action items, assigns them to team members, and schedules follow-ups — all with AI.",
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { icon: Mic, label: "Record Meeting", desc: "Use mic or Google Meet bot", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/20" },
          { icon: Zap, label: "AI Summarizes", desc: "Groq LLM extracts tasks & summary", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
          { icon: CalendarCheck, label: "Auto-Schedule", desc: "Tasks emailed & calendar booked", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-2xl border p-4 ${item.bg}`}>
              <Icon className={`w-6 h-6 ${item.color} mb-2`} />
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: "setup",
    icon: CalendarCheck,
    iconColor: "text-primary",
    iconBg: "bg-primary/15 border-primary/30",
    title: "Quick Setup (2 minutes)",
    subtitle: "Connect your tools once — works automatically after that",
    description: "MeetIQ needs a few connections to work its magic. You can skip any you don't need.",
    content: (
      <div className="space-y-3 mt-4">
        {[
          {
            num: "1",
            title: "Google Calendar & Gmail",
            desc: "Lets MeetIQ book follow-up meetings and email task assignments automatically.",
            required: true,
            action: "Authorize Google",
            href: "/authorize_google",
            color: "border-l-primary",
          },
          {
            num: "2",
            title: "Contacts CSV",
            desc: "Upload a CSV with team names and emails so the AI can match assignees.",
            required: true,
            action: "Add in Settings",
            href: "#settings",
            color: "border-l-violet-500",
          },
          {
            num: "3",
            title: "Slack Bot Token (Optional)",
            desc: "Send task notifications directly to Slack channels.",
            required: false,
            action: "Add in Settings",
            href: "#settings",
            color: "border-l-slate-500",
          },
        ].map((item) => (
          <div
            key={item.num}
            className={`bg-black/30 border border-white/[0.06] border-l-2 ${item.color} rounded-xl px-4 py-3 flex items-center justify-between gap-4`}
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.num}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.required && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-semibold">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
            <a
              href={item.href}
              className="text-xs font-semibold text-primary flex items-center gap-1 whitespace-nowrap hover:text-white transition-colors shrink-0"
            >
              {item.action} <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "record",
    icon: Mic,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-400/15 border-rose-400/30",
    title: "Record Your First Meeting",
    subtitle: "Two ways to capture — pick what works for you",
    description: "You can record from your microphone directly, or send a bot into any Google Meet call.",
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {[
          {
            icon: Mic,
            title: "Local Microphone",
            steps: [
              'Go to "Live Studio" in the sidebar',
              'Click "Start Recording"',
              "Speak — MeetIQ transcribes in real time",
              'Click "Stop & Extract AI" when done',
            ],
            badge: "Easiest — start here",
            badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
            iconColor: "text-sky-400",
            border: "border-sky-400/20",
          },
          {
            icon: Video,
            title: "Google Meet Bot",
            steps: [
              "Open your Google Meet call",
              'Paste the Meet link in "Meet Bot" card',
              'Click "Launch Bot" — bot joins the call',
              'Click "Fetch & Analyze" after the meeting',
            ],
            badge: "Requires Vexa API key",
            badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/25",
            iconColor: "text-violet-400",
            border: "border-violet-400/20",
          },
        ].map((method) => {
          const Icon = method.icon;
          return (
            <div key={method.title} className={`rounded-2xl border ${method.border} bg-black/25 p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${method.iconColor}`} />
                <p className="text-sm font-bold text-white">{method.title}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${method.badgeColor}`}>
                {method.badge}
              </span>
              <ol className="space-y-1.5">
                {method.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
                    <span className="w-4 h-4 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: "explore",
    icon: Users,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/15 border-violet-400/30",
    title: "You're All Set! 🎉",
    subtitle: "Here's what you can explore after your first meeting",
    description: "MeetIQ has powerful features that reveal themselves as you use the app more.",
    content: (
      <div className="space-y-2 mt-4">
        {[
          { emoji: "📄", label: "Meeting History", desc: "All past meetings saved and searchable" },
          { emoji: "📊", label: "Analytics Dashboard", desc: "Team completion rates and task trends" },
          { emoji: "🤖", label: "Ask AI Memory", desc: "Chat with your past meetings — ask anything" },
          { emoji: "🛡️", label: "Decision Ledger", desc: "Cryptographically log every decision made" },
          { emoji: "🔔", label: "Task Digests", desc: "Weekly email summaries of all pending tasks" },
          { emoji: "🔄", label: "Bi-Directional Sync", desc: "Keep task status synced across tools" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/20 border border-white/[0.04] hover:border-white/10 transition-colors"
          >
            <span className="text-lg">{item.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-ink-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function OnboardingModal({ onClose, onGoToSettings }: Props) {
  const [step, setStep] = useState(0);
  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function handleNext() {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-[#0d1322] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-ink-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-emerald-500" : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-4 max-h-[80vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-2">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${currentStep.iconBg}`}>
                    <Icon className={`w-6 h-6 ${currentStep.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{currentStep.title}</h2>
                    <p className="text-xs font-semibold text-ink-muted mt-0.5">{currentStep.subtitle}</p>
                  </div>
                </div>

                <p className="text-sm text-ink-muted leading-relaxed mb-1">{currentStep.description}</p>

                {currentStep.content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-8 py-4 flex items-center justify-between bg-black/20">
            <button
              onClick={() => setStep((s) => s - 1)}
              className={`flex items-center gap-2 text-sm text-ink-muted hover:text-white transition-colors ${isFirst ? "invisible" : ""}`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={handleNext}
              className="btn-primary flex items-center gap-2"
            >
              {isLast ? (
                <>
                  <Sparkles className="w-4 h-4" /> Start Using MeetIQ
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
