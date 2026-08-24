import type { Variants, Transition } from "framer-motion";

/** Spring used for hover/tap feedback across cards and buttons. */
export const springy: Transition = { type: "spring", stiffness: 380, damping: 28 };

/** Stagger container for a group of tiles revealing on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

/** Individual tile entrance — pairs with staggerContainer on a parent. */
export const tileIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

/** Card hover/tap micro-interaction — spread onto whileHover/whileTap. */
export const cardHover = { y: -6, transition: springy };
export const cardTap = { scale: 0.985, transition: springy };

/** List item enter/exit for AnimatePresence-driven lists (transcript, tasks). */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Pop-in for a value that just appeared (calendar event, success state). */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

/** Command palette backdrop + panel. */
export const paletteBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

export const palettePanel: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } },
};
