import { motion, useReducedMotion } from "framer-motion";

/**
 * Fixed, full-viewport ambient background: slow-drifting blurred gradient blobs.
 * Purely decorative and non-interactive (pointer-events-none), sits behind everything.
 * Freezes to a static position under prefers-reduced-motion instead of animating.
 */
export default function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  const blobs = [
    { className: "bg-primary/25 w-[36rem] h-[36rem] -top-40 -left-32", duration: 22 },
    { className: "bg-violet/20 w-[30rem] h-[30rem] top-1/3 -right-24", duration: 26 },
    { className: "bg-indigo/20 w-[28rem] h-[28rem] bottom-0 left-1/4", duration: 20 },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-base" />
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[110px] ${blob.className}`}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 40, -20, 0],
                  y: [0, -30, 20, 0],
                  scale: [1, 1.08, 0.96, 1],
                }
          }
          transition={{ duration: blob.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,15,29,0.4)_100%)]" />
    </div>
  );
}
