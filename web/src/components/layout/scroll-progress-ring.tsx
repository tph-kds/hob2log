"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScrollProgressRing() {
  const pathname = usePathname();
  const isBlogArticle = pathname.startsWith("/blog/");
  const { scrollYProgress } = useScroll();
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 28, restDelta: 0.001 });
  const dashOffset = useTransform(smoothed, [0, 1], [CIRCUMFERENCE, 0]);
  const [complete, setComplete] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBlogArticle) {
      return;
    }

    const unsubProgress = smoothed.on("change", (v) => {
      setComplete(v > 0.98);
      setVisible(v > 0.04);
    });
    return unsubProgress;
  }, [isBlogArticle, smoothed]);

  if (isBlogArticle) {
    return null;
  }

  return (
    <motion.div
      className="scroll-ring-wrap"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-hidden="true"
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        {/* Track circle */}
        <circle cx="24" cy="24" r={RADIUS} stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
        {/* Progress arc */}
        <motion.circle
          cx="24"
          cy="24"
          r={RADIUS}
          stroke="url(#ring-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{
            strokeDashoffset: dashOffset,
            rotate: -90,
            transformOrigin: "24px 24px",
          }}
          className={complete ? "ring-arc-complete" : ""}
        />
      </svg>
      <motion.div
        className="ring-inner-dot"
        animate={complete ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : { scale: 1, opacity: 0.6 }}
        transition={{ repeat: complete ? Infinity : 0, duration: 1.1, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
