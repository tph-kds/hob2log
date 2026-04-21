"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { useRef } from "react";

interface MagneticCardLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

const MotionLink = motion.create(Link);

export function MagneticCardLink({ href, className = "", children }: MagneticCardLinkProps) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 300, damping: 30, mass: 0.5 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 300, damping: 30, mass: 0.5 });

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotateXRaw.set((y - 0.5) * -14);
    rotateYRaw.set((x - 0.5) * 14);
    cardRef.current.style.setProperty("--spot-x", `${x * 100}%`);
    cardRef.current.style.setProperty("--spot-y", `${y * 100}%`);
  }

  function handleMouseLeave() {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  }

  return (
    <MotionLink
      ref={cardRef}
      href={href}
      className={`magnetic-card-link interactive-gradient-card ${className}`}
      style={
        prefersReducedMotion
          ? undefined
          : { rotateX, rotateY, transformStyle: "preserve-3d" }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </MotionLink>
  );
}
