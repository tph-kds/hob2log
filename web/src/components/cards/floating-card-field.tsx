"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface FloatingCardInput {
  id: string;
  title: string;
  imageUrl: string;
  phaseOffset: number;
}

interface FloatingCardFieldProps {
  cards: FloatingCardInput[];
  pointerState: {
    x: number;
    y: number;
  };
}

interface ViewportState {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function pathOne(progress: number, width: number, height: number) {
  const t = clamp(progress, 0, 1);
  const x = lerp(width * 0.78, width * 0.24, t) + Math.sin(t * Math.PI * 4) * 72;
  const y = lerp(height * 0.2, height * 0.74, t) + Math.sin(t * Math.PI * 6) * 42;

  return { x, y };
}

function pathTwo(progress: number, width: number, height: number) {
  const t = clamp(progress, 0, 1);
  const x = lerp(width * 0.2, width * 0.78, t) + Math.cos(t * Math.PI * 3.8) * 76;
  const y = lerp(height * 0.76, height * 0.22, t) + Math.sin(t * Math.PI * 5) * 48;

  return { x, y };
}

export function FloatingCardField({ cards, pointerState }: FloatingCardFieldProps) {
  const [viewport, setViewport] = useState<ViewportState>({ width: 0, height: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [time, setTime] = useState(0);
  const [motionFactor, setMotionFactor] = useState(1);

  useEffect(() => {
    function readMotionFactor() {
      const styles = getComputedStyle(document.documentElement);
      const rawValue = Number.parseFloat(styles.getPropertyValue("--floating-field-motion"));
      setMotionFactor(Number.isFinite(rawValue) ? rawValue : 1);
    }

    readMotionFactor();

    const observer = new MutationObserver(readMotionFactor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    let isTicking = false;

    function onScroll() {
      if (isTicking) {
        return;
      }

      isTicking = true;

      window.requestAnimationFrame(() => {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = clamp(window.scrollY / maxScroll, 0, 1);
        setScrollProgress(progress);
        isTicking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    function tick(now: number) {
      setTime(now * 0.0015);
      animationFrame = window.requestAnimationFrame(tick);
    }

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  if (viewport.width === 0 || cards.length === 0) {
    return null;
  }

  return (
    <div className="floating-card-field" aria-hidden="true">
      {cards.slice(0, 2).map((card, index) => {
        const travelProgress = clamp((scrollProgress - 0.08) / 0.82, 0, 1);
        const path = index === 0 ? pathOne(travelProgress, viewport.width, viewport.height) : pathTwo(travelProgress, viewport.width, viewport.height);
        const depthCycle = Math.sin((scrollProgress * Math.PI * 2.2) + card.phaseOffset);
        const depthFactor = (depthCycle + 1) * 0.5;
        const baseEnvelope = clamp((scrollProgress - 0.04) / 0.16, 0, 1) * (1 - clamp((scrollProgress - 0.88) / 0.12, 0, 1));
        const motionEnvelope = Math.max(0.22, baseEnvelope) * motionFactor;
        const driftX = (Math.sin(time + card.phaseOffset) * 18 + pointerState.x * 24) * motionEnvelope;
        const driftY = (Math.cos(time * 1.2 + card.phaseOffset) * 12 + pointerState.y * 16) * motionEnvelope;
        const rotateX = (Math.sin(time * 1.4 + card.phaseOffset) * 14 + (travelProgress - 0.5) * 18) * motionEnvelope;
        const rotateY = (Math.cos(time * 1.1 + card.phaseOffset) * 16 + pointerState.x * 10) * motionEnvelope;
        const rotateZ = (Math.sin(time * 1.8 + card.phaseOffset) * 18 + (travelProgress - 0.5) * 34) * motionEnvelope;
        const scale = lerp(0.74, 1.18, depthFactor);
        const blur = lerp(4.6, 1.2, depthFactor);
        const opacity = lerp(0.22, 0.66, depthFactor);
        const layerIndex = Math.round(10 + depthFactor * 20);

        const style = {
          left: `${path.x + driftX}px`,
          top: `${path.y + driftY}px`,
          transform: `translate(-50%, -50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
          filter: `blur(${blur}px) drop-shadow(0 24px 42px color-mix(in srgb, var(--background) 72%, transparent)) drop-shadow(0 0 20px color-mix(in srgb, var(--accent) 30%, transparent))`,
          opacity,
          zIndex: layerIndex,
        };

        return (
          <article key={card.id} className="floating-diamond-card" style={style}>
            <div className="floating-diamond-shell" />
            <div className="floating-diamond-image-wrap">
              <Image
                src={card.imageUrl}
                alt={card.title}
                loading="lazy"
                width={860}
                height={1204}
                unoptimized
                className="floating-diamond-image"
              />
              <div className="floating-diamond-gradient" />
            </div>
          </article>
        );
      })}
    </div>
  );
}