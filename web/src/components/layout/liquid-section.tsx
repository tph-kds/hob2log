"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

interface LiquidSectionProps {
  children: ReactNode;
  className?: string;
}

export function LiquidSection({ children, className = "" }: LiquidSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const primaryFlowY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["-28%", "24%"]
  );
  const secondaryFlowY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["16%", "-20%"]
  );
  const primaryRotate = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-3, 4]);
  const secondaryRotate = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [4, -5]);

  return (
    <motion.section
      ref={sectionRef}
      className={`liquid-panel relative overflow-hidden ${className}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div aria-hidden="true" className="glass-panel glass-panel-layer" />
      <motion.div
        aria-hidden="true"
        className="liquid-wave liquid-wave-primary"
        style={{ y: primaryFlowY, rotate: primaryRotate }}
      />
      <motion.div
        aria-hidden="true"
        className="liquid-wave liquid-wave-secondary"
        style={{ y: secondaryFlowY, rotate: secondaryRotate }}
      />
      <div className="liquid-content-layer">{children}</div>
    </motion.section>
  );
}
