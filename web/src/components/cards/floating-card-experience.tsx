"use client";

import { useEffect, useState } from "react";
import { FloatingCardField } from "@/components/cards/floating-card-field";
import { FloatingCardScene } from "@/components/cards/floating-card-scene";

interface FloatingCardInput {
  id: string;
  title: string;
  imageUrl: string;
  backImageUrl: string;
  phaseOffset: number;
}

interface FloatingCardExperienceProps {
  cards: FloatingCardInput[];
}

interface PointerState {
  x: number;
  y: number;
}

type RenderMode = "loading" | "fallback" | "webgl";

function supportsWebGl() {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}

function isMotionForced() {
  return document.documentElement.getAttribute("data-motion") === "force";
}

function getRenderMode(): RenderMode {
  const isSmallScreen = window.matchMedia("(max-width: 840px)").matches;
  const reducedMotion = !isMotionForced() && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isSmallScreen || reducedMotion || !supportsWebGl()) {
    return "fallback";
  }

  return "webgl";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function FloatingCardExperience({ cards }: FloatingCardExperienceProps) {
  const [mode, setMode] = useState<RenderMode>("loading");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pointerState, setPointerState] = useState<PointerState>({ x: 0, y: 0 });

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMode(getRenderMode());
    });

    function onResize() {
      setMode(getRenderMode());
    }

    function onMotionPreferenceChange() {
      setMode(getRenderMode());
    }

    window.addEventListener("resize", onResize);

    const observer = new MutationObserver(onMotionPreferenceChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (mode !== "webgl") {
      return;
    }

    let ticking = false;

    function onScroll() {
      if (ticking) {
        return;
      }

      ticking = true;

      window.requestAnimationFrame(() => {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrollProgress(clamp(window.scrollY / maxScroll, 0, 1));
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const x = clamp(event.clientX / window.innerWidth, 0, 1) * 2 - 1;
      const y = clamp(event.clientY / window.innerHeight, 0, 1) * 2 - 1;
      setPointerState({ x, y });
    }

    function onPointerLeave() {
      setPointerState({ x: 0, y: 0 });
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  if (mode === "webgl") {
    return <FloatingCardScene cards={cards} scrollProgress={scrollProgress} pointerState={pointerState} />;
  }

  if (mode === "fallback") {
    return <FloatingCardField cards={cards} pointerState={pointerState} />;
  }

  return null;
}