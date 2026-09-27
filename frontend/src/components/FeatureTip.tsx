import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

interface Props {
  tip: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Small "?" icon that shows a tooltip explaining a feature.
 * Use it in card headers so new users know what each panel does.
 */
export default function FeatureTip({ tip, side = "top" }: Props) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <button
        className="p-0.5 text-ink-muted/50 hover:text-ink-muted transition-colors focus:outline-none"
        tabIndex={0}
        aria-label="Feature help"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 ${positionClasses[side]} w-56 pointer-events-none`}
          >
            <div className="bg-[#111827] border border-white/15 rounded-xl px-3 py-2 shadow-xl">
              <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
