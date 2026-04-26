"use client";

import { useEffect, useRef, useState } from "react";
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
  const pointerTargetRef = useRef<PointerState>({ x: 0, y: 0 });
  const pointerRef = useRef<PointerState>({ x: 0, y: 0 });
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const nextMode = getRenderMode();
      setMode((prev) => (prev === nextMode ? prev : nextMode));
    });

    function onResize() {
      const nextMode = getRenderMode();
      setMode((prev) => (prev === nextMode ? prev : nextMode));
    }

    function onMotionPreferenceChange() {
      const nextMode = getRenderMode();
      setMode((prev) => (prev === nextMode ? prev : nextMode));
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
    let raf = 0;
    let scrollDirty = true;
    let idleFrames = 0;

    function requestTick() {
      if (raf !== 0) {
        return;
      }

      raf = window.requestAnimationFrame(tick);
    }

    function updateScrollProgress() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgressRef.current = clamp(window.scrollY / maxScroll, 0, 1);
      scrollDirty = false;
    }

    function onPointerMove(event: PointerEvent) {
      const x = clamp(event.clientX / window.innerWidth, 0, 1) * 2 - 1;
      const y = clamp(event.clientY / window.innerHeight, 0, 1) * 2 - 1;
      pointerTargetRef.current.x = x;
      pointerTargetRef.current.y = y;
      requestTick();
    }

    function onPointerLeave() {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
      requestTick();
    }

    function onScroll() {
      scrollDirty = true;
      requestTick();
    }

    function tick() {
      raf = 0;
      const smoothing = mode === "webgl" ? 0.16 : 0.22;
      const prevX = pointerRef.current.x;
      const prevY = pointerRef.current.y;

      pointerRef.current.x += (pointerTargetRef.current.x - pointerRef.current.x) * smoothing;
      pointerRef.current.y += (pointerTargetRef.current.y - pointerRef.current.y) * smoothing;

      if (scrollDirty) {
        updateScrollProgress();
      }

      const pointerDelta = Math.abs(pointerRef.current.x - prevX) + Math.abs(pointerRef.current.y - prevY);
      const isStillActive = scrollDirty || pointerDelta > 0.0008;

      if (isStillActive) {
        idleFrames = 0;
        requestTick();
        return;
      }

      idleFrames += 1;

      if (idleFrames < 20) {
        requestTick();
      }
    }

    updateScrollProgress();
    requestTick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [mode]);

  if (mode === "webgl") {
    return <FloatingCardScene cards={cards} scrollProgressRef={scrollProgressRef} pointerRef={pointerRef} />;
  }

  if (mode === "fallback") {
    return <FloatingCardField cards={cards} pointerRef={pointerRef} scrollProgressRef={scrollProgressRef} />;
  }

  return null;
}
