"use client";

import { useEffect, useRef } from "react";

interface LiquidDistortionCanvasProps {
  targetRef: { current: HTMLElement | null };
  radius?: number;
  isActive: boolean;
}

type Particle = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  hueOffset: number;
  alpha: number;
  seed: number;
};

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function LiquidDistortionCanvas({ targetRef, radius = 120, isActive }: LiquidDistortionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const target = targetRef.current;

    if (!canvas || !target) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      return;
    }

    const pointer = { x: -10000, y: -10000, inside: false };
    const particles: Particle[] = [];
    const padding = Math.ceil(radius + 24);
    const sampleStep = 4;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    let rafId = 0;
    let isAnimating = false;
    let width = 0;
    let height = 0;

    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });

    if (!offscreenContext) {
      return;
    }

    function buildParticles() {
      const rect = target.getBoundingClientRect();
      width = Math.max(2, Math.round(rect.width + padding * 2));
      height = Math.max(2, Math.round(rect.height + padding * 2));

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      offscreen.width = Math.round(width * dpr);
      offscreen.height = Math.round(height * dpr);
      offscreenContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreenContext.clearRect(0, 0, width, height);

      const charNodes = target.querySelectorAll<HTMLElement>("[data-reveal-char]");

      offscreenContext.textAlign = "center";
      offscreenContext.textBaseline = "middle";
      offscreenContext.fillStyle = "rgba(255,255,255,1)";

      charNodes.forEach((charNode) => {
        const value = (charNode.textContent ?? "").trim();

        if (!value) {
          return;
        }

        const charRect = charNode.getBoundingClientRect();
        const charComputed = window.getComputedStyle(charNode);
        const charFont = `${charComputed.fontStyle || "normal"} ${charComputed.fontWeight || "700"} ${charComputed.fontSize || "48px"} ${charComputed.fontFamily || "sans-serif"}`;

        offscreenContext.font = charFont;

        const cx = charRect.left - rect.left + charRect.width * 0.5 + padding;
        const cy = charRect.top - rect.top + charRect.height * 0.5 + padding;
        offscreenContext.fillText(value, cx, cy);
      });

      const image = offscreenContext.getImageData(0, 0, width, height).data;
      particles.length = 0;

      for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
          const alpha = image[(y * width + x) * 4 + 3];

          if (alpha < 110) {
            continue;
          }

          particles.push({
            x,
            y,
            ox: x,
            oy: y,
            vx: 0,
            vy: 0,
            size: 1 + Math.random() * 1.6,
            hueOffset: Math.random(),
            alpha: 0,
            seed: Math.random() * 1000,
          });
        }
      }
    }

    function updatePointerFromEvent(event: PointerEvent) {
      const rect = target.getBoundingClientRect();
      pointer.x = event.clientX - rect.left + padding;
      pointer.y = event.clientY - rect.top + padding;
    }

    function handlePointerEnter(event: PointerEvent) {
      pointer.inside = true;
      updatePointerFromEvent(event);
      if (!isAnimating) {
        isAnimating = true;
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      updatePointerFromEvent(event);

      if (!isAnimating) {
        isAnimating = true;
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function handlePointerLeave() {
      pointer.inside = false;
    }

    function tick() {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      let hasResidualMotion = false;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        let influence = 0;

        if (pointer.inside && isActive) {
          const edgeBlendStart = radius * 0.72;
          influence = 1 - smoothstep(edgeBlendStart, radius, distance);
        }

        if (influence > 0) {
          const invDistance = 1 / Math.max(1, distance);
          const nx = dx * invDistance;
          const ny = dy * invDistance;
          const swirl = (Math.sin(particle.seed + performance.now() * 0.005) * 0.5 + 0.5) * influence;

          particle.vx += nx * influence * 1.6 + -ny * swirl * 0.9;
          particle.vy += ny * influence * 1.6 + nx * swirl * 0.9;
          particle.alpha += (0.92 - particle.alpha) * 0.2;
        } else {
          particle.alpha += (0 - particle.alpha) * 0.08;
        }

        particle.vx += (particle.ox - particle.x) * 0.068;
        particle.vy += (particle.oy - particle.y) * 0.068;
        particle.vx *= 0.84;
        particle.vy *= 0.84;

        particle.x += particle.vx;
        particle.y += particle.vy;

        const speed = Math.abs(particle.vx) + Math.abs(particle.vy);
        const shouldDraw = influence > 0.01 || speed > 0.04 || particle.alpha > 0.02;

        if (speed > 0.01 || particle.alpha > 0.01) {
          hasResidualMotion = true;
        }

        if (!shouldDraw) {
          continue;
        }

        const hue = 188 + particle.hueOffset * 102 + influence * 28;
        const lightness = 60 + influence * 14;
        const drawAlpha = Math.min(1, particle.alpha * (0.55 + influence * 0.45));
        const size = particle.size + influence * 1.8;

        context.fillStyle = `hsla(${hue.toFixed(2)} 100% ${lightness.toFixed(2)}% / ${drawAlpha.toFixed(3)})`;
        context.beginPath();
        context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";

      if (pointer.inside || hasResidualMotion) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      isAnimating = false;
    }

    buildParticles();
    isAnimating = true;
    rafId = window.requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(() => {
      buildParticles();
    });

    resizeObserver.observe(target);
    target.addEventListener("pointerenter", handlePointerEnter);
    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      target.removeEventListener("pointerenter", handlePointerEnter);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [isActive, radius, targetRef]);

  return <canvas ref={canvasRef} className="title-liquid-layer" aria-hidden="true" />;
}
