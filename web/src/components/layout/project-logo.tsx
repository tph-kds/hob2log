"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type EnergyStream = {
  t: number;
  speed: number;
  direction: 1 | -1;
  phase: number;
  frequency: number;
  amplitude: number;
  thickness: number;
  colorPhase: number;
};

type PointerState = {
  xNorm: number;
  yNorm: number;
  xNormTarget: number;
  yNormTarget: number;
};

const BASE_TEXT = "Tran Phi Hung Blog";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createStreams(count: number, frontLayer: boolean): EnergyStream[] {
  return Array.from({ length: count }, (_, index) => {
    const direction: 1 | -1 = index % 2 === 0 ? 1 : -1;
    return {
      t: Math.random(),
      speed: (frontLayer ? 0.085 : 0.07) + Math.random() * 0.06,
      direction,
      phase: Math.random() * Math.PI * 2,
      frequency: 1 + Math.random() * 1.4,
      amplitude: 0.55 + Math.random() * 0.85,
      thickness: (frontLayer ? 0.56 : 0.45) + Math.random() * 0.52,
      colorPhase: Math.random() * Math.PI * 2,
    };
  });
}

function buildEnergyPalette(stream: EnergyStream, time: number, pointer: PointerState, frontLayer: boolean) {
  const phase = time * 0.001 + stream.colorPhase + pointer.xNorm * Math.PI * 0.85;
  const swing = 0.5 + 0.5 * Math.sin(phase);
  const coolShift = Math.sin(phase * 0.62 + pointer.yNorm * Math.PI * 0.8);

  const gold = 46;
  const aqua = 190 + coolShift * 14;
  const violet = 268 + Math.cos(phase * 0.74) * 18;

  const primaryHue = gold * (1 - swing) + aqua * swing;
  const accentHue = aqua * (1 - swing) + violet * swing;
  const sparkHue = frontLayer ? 38 + swing * 16 : 54 + swing * 10;

  return {
    primaryHue,
    accentHue,
    sparkHue,
  };
}

function computePoint(
  stream: EnergyStream,
  u: number,
  time: number,
  width: number,
  height: number,
  pointer: PointerState,
  frontLayer: boolean,
) {
  const travel = stream.direction > 0 ? u : 1 - u;
  const x = width * (travel * 1.1 - 0.05);
  const centerY = height * 0.54;
  const ampBase = height * (frontLayer ? 0.12 : 0.1) * stream.amplitude;
  const ampControl = 0.55 + pointer.yNorm * 1.25;
  const amp = ampBase * ampControl;
  const timeWave = time * 0.0015 * stream.direction;
  const wave = Math.sin(travel * Math.PI * 2 * stream.frequency + stream.phase + timeWave);
  const curve = Math.sin(travel * Math.PI * (1.25 + stream.frequency * 0.3) + stream.phase * 0.45 + time * 0.0008) * amp * 0.34;
  const pull = Math.exp(-Math.pow(travel - pointer.xNorm, 2) / 0.02);
  const cursorBend = (pointer.yNorm - 0.5) * height * 0.32 * pull;
  const y = centerY + wave * amp + curve + cursorBend;

  return { x, y };
}

export function ProjectLogo() {
  const pathname = usePathname();
  const [isAtTop, setIsAtTop] = useState(true);
  const rootRef = useRef<HTMLAnchorElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    function syncTopState() {
      setIsAtTop(window.scrollY <= 22);
    }

    syncTopState();
    window.addEventListener("scroll", syncTopState, { passive: true });
    window.addEventListener("resize", syncTopState);

    return () => {
      window.removeEventListener("scroll", syncTopState);
      window.removeEventListener("resize", syncTopState);
    };
  }, [pathname]);

  useEffect(() => {
    const rootEl = rootRef.current;
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;

    if (!rootEl || !backCanvas || !frontCanvas) {
      return;
    }

    const root = rootEl;
    const back = backCanvas;
    const front = frontCanvas;

    const backCtx = back.getContext("2d");
    const frontCtx = front.getContext("2d");

    if (!backCtx || !frontCtx) {
      return;
    }

    const backContext = backCtx;
    const frontContext = frontCtx;

    const pointer: PointerState = {
      xNorm: 0.5,
      yNorm: 0.5,
      xNormTarget: 0.5,
      yNormTarget: 0.5,
    };

    const backStreams = createStreams(9, false);
    const frontStreams = createStreams(10, true);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let lastTime = performance.now();

    function resizeCanvases() {
      const rect = root.getBoundingClientRect();
      width = Math.max(10, rect.width);
      height = Math.max(10, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (const canvas of [back, front]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      backContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      frontContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = root.getBoundingClientRect();
      pointer.xNormTarget = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      pointer.yNormTarget = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    }

    function handlePointerLeave() {
      pointer.xNormTarget = 0.5;
      pointer.yNormTarget = 0.5;
    }

    function drawLayer(
      ctx: CanvasRenderingContext2D,
      streams: EnergyStream[],
      time: number,
      dt: number,
      frontLayer: boolean,
    ) {
      ctx.clearRect(0, 0, width, height);

      const dominance = (pointer.xNorm - 0.5) * 2;

      for (const stream of streams) {
        const flowGain = 1 + dominance * stream.direction * 0.9;
        stream.t = (stream.t + dt * stream.speed * clamp(flowGain, 0.35, 1.85)) % 1;

        const tailPoints = frontLayer ? 18 : 14;
        const step = frontLayer ? 0.023 : 0.026;
        let prevPoint: { x: number; y: number } | null = null;

        for (let i = 0; i < tailPoints; i += 1) {
          const u = (stream.t - i * step + 1) % 1;
          const point = computePoint(stream, u, time, width, height, pointer, frontLayer);
          const tFade = 1 - i / tailPoints;
          const alpha = Math.pow(tFade, frontLayer ? 1.5 : 1.82) * (frontLayer ? 0.82 : 0.5);
          const size = (frontLayer ? 1.55 : 1.2) * stream.thickness * (0.28 + tFade * 0.95);
          const { primaryHue, accentHue, sparkHue } = buildEnergyPalette(stream, time, pointer, frontLayer);

          if (prevPoint) {
            const jitter = Math.sin(time * 0.01 + i * 0.45 + stream.phase) * (frontLayer ? 1.15 : 0.72);
            const gradient = ctx.createLinearGradient(prevPoint.x, prevPoint.y, point.x + jitter, point.y - jitter * 0.45);
            gradient.addColorStop(0, `hsla(${primaryHue}, 98%, 80%, ${alpha * (frontLayer ? 0.82 : 0.66)})`);
            gradient.addColorStop(0.52, `hsla(${accentHue}, 100%, 78%, ${alpha * (frontLayer ? 0.96 : 0.7)})`);
            gradient.addColorStop(1, `hsla(${sparkHue}, 100%, 92%, ${alpha * (frontLayer ? 0.78 : 0.54)})`);
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x + jitter, point.y - jitter * 0.45);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = (frontLayer ? 0.82 : 0.62) * tFade;
            ctx.shadowColor = `hsla(${sparkHue}, 100%, 78%, ${frontLayer ? 0.5 : 0.34})`;
            ctx.shadowBlur = frontLayer ? 6 : 4;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.fillStyle = frontLayer
            ? `hsla(${primaryHue}, 100%, 84%, ${alpha})`
            : `hsla(${accentHue}, 98%, 78%, ${alpha * 0.95})`;
          ctx.shadowColor = frontLayer
            ? `hsla(${sparkHue}, 100%, 76%, 0.62)`
            : `hsla(${accentHue}, 92%, 72%, 0.4)`;
          ctx.shadowBlur = frontLayer ? 8 : 5;
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();

          if (frontLayer && i % 5 === 0) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${sparkHue}, 100%, 94%, ${alpha * 0.82})`;
            ctx.lineWidth = 0.58;
            ctx.moveTo(point.x - size * 1.1, point.y + size * 0.3);
            ctx.lineTo(point.x + size * 1.25, point.y - size * 0.35);
            ctx.stroke();
          }

          prevPoint = point;
        }
      }
    }

    function frame(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      pointer.xNorm += (pointer.xNormTarget - pointer.xNorm) * 0.1;
      pointer.yNorm += (pointer.yNormTarget - pointer.yNorm) * 0.1;

      drawLayer(backContext, backStreams, now, dt, false);
      drawLayer(frontContext, frontStreams, now, dt, true);

      if (!prefersReducedMotion) {
        raf = requestAnimationFrame(frame);
      }
    }

    resizeCanvases();
    lastTime = performance.now();
    frame(lastTime);

    window.addEventListener("resize", resizeCanvases);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvases);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <Link
      href="/"
      ref={rootRef}
      className={`site-logo-permanent leading-none ${isAtTop ? "is-at-top" : "is-hidden"}`}
      aria-label={BASE_TEXT}
    >
      <span className="site-logo-energy-canvas-wrap site-logo-energy-back" aria-hidden="true">
        <canvas ref={backCanvasRef} className="site-logo-energy-canvas" />
      </span>
      <span data-text={BASE_TEXT} className="site-logo-title-core text-lg font-semibold tracking-tight md:text-3xl">
        {BASE_TEXT}
      </span>
      <span className="site-logo-energy-canvas-wrap site-logo-energy-front" aria-hidden="true">
        <canvas ref={frontCanvasRef} className="site-logo-energy-canvas" />
      </span>
    </Link>
  );
}
