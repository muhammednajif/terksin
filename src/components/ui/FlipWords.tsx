import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const FlipWords = ({
  words,
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [duration, words.length]);

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        layout
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.5 }}
        className={cn("inline-block whitespace-nowrap", className)}
        key={words[index]}
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
};
