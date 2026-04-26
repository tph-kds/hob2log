"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

interface FloatingCardInput {
  id: string;
  title: string;
  imageUrl: string;
  backImageUrl: string;
  phaseOffset: number;
}

interface FloatingCardFieldProps {
  cards: FloatingCardInput[];
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: MutableRefObject<number>;
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

export function FloatingCardField({ cards, pointerRef, scrollProgressRef }: FloatingCardFieldProps) {
  const [viewport, setViewport] = useState<ViewportState>({ width: 0, height: 0 });
  const [motionFactor, setMotionFactor] = useState(1);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

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
    window.addEventListener("resize", updateViewport, { passive: true });

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const visibleCards = cards.slice(0, 2);

    function tick(now: number) {
      const time = now * 0.0015;
      const pointerState = pointerRef.current;
      const scrollProgress = clamp(scrollProgressRef.current, 0, 1);
      const travelProgress = clamp((scrollProgress - 0.08) / 0.82, 0, 1);

      for (let index = 0; index < visibleCards.length; index += 1) {
        const card = visibleCards[index];
        const node = cardRefs.current[index];

        if (!card || !node) {
          continue;
        }

        const path = index === 0
          ? pathOne(travelProgress, viewport.width, viewport.height)
          : pathTwo(travelProgress, viewport.width, viewport.height);
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
        const opacity = lerp(0.22, 0.66, depthFactor);
        const layerIndex = Math.round(10 + depthFactor * 20);

        node.style.transform = `translate3d(${path.x + driftX}px, ${path.y + driftY}px, 0) translate(-50%, -50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
        node.style.opacity = `${opacity}`;
        node.style.zIndex = `${layerIndex}`;
      }

      animationFrame = window.requestAnimationFrame(tick);
    }

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [cards, motionFactor, pointerRef, scrollProgressRef, viewport.height, viewport.width]);

  if (viewport.width === 0 || cards.length === 0) {
    return null;
  }

  return (
    <div className="floating-card-field" aria-hidden="true">
      {cards.slice(0, 2).map((card, index) => {
        const style = {
          transform: "translate3d(-9999px, -9999px, 0)",
          filter: "none",
          opacity: 0,
          zIndex: 1,
        };

        return (
          <article
            key={card.id}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className="floating-diamond-card"
            style={style}
          >
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
