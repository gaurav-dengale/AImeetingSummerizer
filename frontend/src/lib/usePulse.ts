import { useAnimate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** Attach the returned ref to an element; it briefly scale-pops whenever `value` changes. */
export function usePulseOnChange<T>(value: T) {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const prev = useRef(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      prev.current = value;
      return;
    }
    if (prev.current !== value) {
      if (!reduceMotion) {
        animate(scope.current, { scale: [1, 1.12, 1] }, { duration: 0.3, ease: "easeInOut" });
      }
      prev.current = value;
    }
  }, [value, animate, reduceMotion, scope]);

  return scope;
}
