import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import type { ReactNode, PointerEvent } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  strength?: number;
  className?: string;
}

/**
 * A CTA button that gently follows the pointer within its bounds ("magnetic" hover).
 * Reserve for the 1-2 most important actions on screen — used everywhere it reads as noisy
 * rather than premium. No-op (renders a plain button) under prefers-reduced-motion.
 */
export default function MagneticButton({ children, onClick, disabled, strength = 0.3, className }: Props) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  }

  function handlePointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={reduceMotion ? undefined : { x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
