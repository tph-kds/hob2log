"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

interface MagneticCardLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

const MotionLink = motion.create(Link);

export function MagneticCardLink({ href, className = "", children }: MagneticCardLinkProps) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const cardRectRef = useRef<DOMRect | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 300, damping: 30, mass: 0.5 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 300, damping: 30, mass: 0.5 });

  useEffect(() => {
    return () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  function syncRect() {
    if (!cardRef.current) {
      return;
    }

    cardRectRef.current = cardRef.current.getBoundingClientRect();
  }

  function applyPointer() {
    pointerFrameRef.current = null;

    if (!cardRef.current || !cardRectRef.current || !pendingPointerRef.current || prefersReducedMotion) {
      return;
    }

    const rect = cardRectRef.current;
    const pointer = pendingPointerRef.current;
    const x = (pointer.x - rect.left) / rect.width;
    const y = (pointer.y - rect.top) / rect.height;
    rotateXRaw.set((y - 0.5) * -14);
    rotateYRaw.set((x - 0.5) * 14);
    cardRef.current.style.setProperty("--spot-x", `${x * 100}%`);
    cardRef.current.style.setProperty("--spot-y", `${y * 100}%`);
  }

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    if (!cardRef.current || prefersReducedMotion) {
      return;
    }

    pendingPointerRef.current = { x: e.clientX, y: e.clientY };

    if (pointerFrameRef.current === null) {
      pointerFrameRef.current = window.requestAnimationFrame(applyPointer);
    }
  }

  function handleMouseLeave() {
    pendingPointerRef.current = null;

    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

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
      onMouseEnter={syncRect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </MotionLink>
  );
}
