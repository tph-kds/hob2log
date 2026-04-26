"use client";

import { useEffect, useRef, type RefObject } from "react";

export type EffectMode = "smoke" | "spark" | "ember" | "frost" | "all";

interface ParticleSmokeCanvasProps {
  targetRef: RefObject<HTMLElement | null>;
  radius?: number;
  isActive: boolean;
  mode?: EffectMode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  decay: number;
  r: number;
  g: number;
  b: number;
  type: "spark" | "smoke" | "ember" | "frost";
  turbX: number;
  turbY: number;
  age: number;
  maxAge: number;
}

type ThemePalette = Array<[number, number, number]>;

function getThemePalette(): ThemePalette {
  const theme =
    typeof document !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") ?? "ocean")
      : "ocean";

  const palettes: Record<string, ThemePalette> = {
    ocean:    [[79,209,255],[144,247,206],[150,180,255],[220,240,255],[100,200,255]],
    sunset:   [[255,132,188],[255,211,122],[238,130,255],[255,200,160],[255,160,120]],
    forest:   [[102,227,189],[156,232,255],[140,220,130],[200,255,210],[120,200,170]],
    dawn:     [[255,146,123],[255,178,142],[255,165,201],[255,222,168],[255,233,205]],
    pearl:    [[124,184,232],[145,208,246],[190,224,248],[218,241,255],[160,202,235]],
    mint:     [[92,176,138],[112,193,152],[146,205,118],[181,219,166],[112,179,164]],
    eclipse:  [[104,112,255],[111,214,255],[82,227,176],[197,169,255],[145,250,225]],
    mono:     [[158,199,255],[184,214,255],[200,210,240],[220,230,250],[180,195,220]],
    latte:    [[181,123,86],[159,141,197],[220,170,130],[200,160,120],[180,150,200]],
    mocha:    [[137,180,250],[166,227,161],[203,166,247],[190,200,255],[160,210,200]],
    sidewalk: [[253,211,101],[210,234,241],[240,220,140],[255,240,180],[200,225,235]],
    leather:  [[213,154,106],[240,200,157],[200,140,90],[230,190,150],[210,165,120]],
  };

  return palettes[theme] ?? palettes.ocean;
}

function pickColor(palette: ThemePalette, bias?: number): [number, number, number] {
  const idx = bias !== undefined
    ? Math.floor(bias * palette.length) % palette.length
    : Math.floor(Math.random() * palette.length);
  return palette[idx];
}

function spawnParticle(
  cx: number,
  cy: number,
  radius: number,
  palette: ThemePalette,
  mode: EffectMode
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius * 0.72;
  const x = cx + Math.cos(angle) * dist;
  const y = cy + Math.sin(angle) * dist;
  const bias = Math.random();
  const [r, g, b] = pickColor(palette, bias);

  // Determine particle type from mode
  let type: Particle["type"];
  if (mode === "all") {
    const roll = Math.random();
    type = roll < 0.3 ? "smoke" : roll < 0.65 ? "spark" : roll < 0.82 ? "ember" : "frost";
  } else if (mode === "smoke") {
    type = "smoke";
  } else if (mode === "spark") {
    type = "spark";
  } else if (mode === "ember") {
    type = "ember";
  } else {
    type = "frost";
  }

  switch (type) {
    case "spark": {
      const speed = 0.9 + Math.random() * 2.2;
      const dir = angle + (Math.random() - 0.5) * 1.4;
      return {
        x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed - 0.4,
        size: 1.5 + Math.random() * 2.5, opacity: 0.9 + Math.random() * 0.1,
        decay: 0.022 + Math.random() * 0.018,
        r, g, b, type,
        turbX: (Math.random() - 0.5) * 0.12,
        turbY: (Math.random() - 0.5) * 0.08,
        age: 0, maxAge: 28 + Math.random() * 22,
      };
    }
    case "smoke": {
      return {
        x, y, vx: (Math.random() - 0.5) * 0.5, vy: -(0.28 + Math.random() * 0.42),
        size: 8 + Math.random() * 18, opacity: 0.12 + Math.random() * 0.18,
        decay: 0.007 + Math.random() * 0.006,
        r, g, b, type,
        turbX: (Math.random() - 0.5) * 0.22,
        turbY: (Math.random() - 0.5) * 0.06,
        age: 0, maxAge: 60 + Math.random() * 60,
      };
    }
    case "ember": {
      const speed = 0.4 + Math.random() * 1.0;
      const dir = -(Math.PI / 2) + (Math.random() - 0.5) * 1.8;
      return {
        x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
        size: 2 + Math.random() * 3.5, opacity: 0.7 + Math.random() * 0.3,
        decay: 0.012 + Math.random() * 0.01,
        r: Math.min(255, r + 40), g: Math.max(0, g - 30), b: Math.max(0, b - 60),
        type,
        turbX: (Math.random() - 0.5) * 0.28,
        turbY: -0.06 - Math.random() * 0.08,
        age: 0, maxAge: 40 + Math.random() * 40,
      };
    }
    case "frost": {
      const speed = 0.3 + Math.random() * 0.8;
      const dir = angle;
      return {
        x, y, vx: Math.cos(dir) * speed * 0.5, vy: Math.sin(dir) * speed * 0.5,
        size: 3 + Math.random() * 6, opacity: 0.5 + Math.random() * 0.4,
        decay: 0.009 + Math.random() * 0.008,
        r: Math.min(255, r + 60), g: Math.min(255, g + 40), b: Math.min(255, b + 60),
        type,
        turbX: (Math.random() - 0.5) * 0.06,
        turbY: (Math.random() - 0.5) * 0.06,
        age: 0, maxAge: 50 + Math.random() * 50,
      };
    }
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const progress = p.age / p.maxAge;
  const alphaMult = 1 - progress * progress;
  const alpha = Math.max(0, p.opacity * alphaMult);

  if (alpha <= 0.005) return;

  switch (p.type) {
    case "spark": {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - progress * 0.5)), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${p.r},${p.g},${p.b},${alpha * 0.8})`;
      ctx.fill();
      break;
    }
    case "smoke": {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha * 0.9})`);
      grd.addColorStop(0.5, `rgba(${p.r},${p.g},${p.b},${alpha * 0.4})`);
      grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.shadowBlur = 0;
      ctx.fill();
      break;
    }
    case "ember": {
      ctx.beginPath();
      const size = p.size * (1 - progress * 0.3);
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      const innerColor = `rgba(255,${Math.round(p.g * 0.7)},${Math.round(p.b * 0.3)},${alpha})`;
      const outerColor = `rgba(${p.r},${Math.round(p.g * 0.4)},0,${alpha * 0.5})`;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grd.addColorStop(0, innerColor);
      grd.addColorStop(1, outerColor);
      ctx.fillStyle = grd;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(255,80,0,${alpha * 0.6})`;
      ctx.fill();
      break;
    }
    case "frost": {
      ctx.beginPath();
      const s = p.size * (1 + progress * 0.3);
      ctx.arc(p.x, p.y, Math.max(0.5, s), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.8})`;
      ctx.lineWidth = 0.8;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${p.r},${p.g},${p.b},${alpha * 0.5})`;
      ctx.stroke();
      // Ice core
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, s * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.shadowBlur = 4;
      ctx.fill();
      break;
    }
  }
}

export function ParticleSmokeCanvas({
  targetRef,
  radius = 110,
  isActive,
  mode = "all",
}: ParticleSmokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(isActive);
  const posRef = useRef({ x: 0, y: 0 });
  const modeRef = useRef(mode);
  const paletteRef = useRef<ThemePalette>(getThemePalette());
  const startLoopRef = useRef<(() => void) | null>(null);

  // Keep refs in sync
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;

    const syncPalette = () => {
      paletteRef.current = getThemePalette();
    };

    syncPalette();
    const observer = new MutationObserver(syncPalette);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const targetNode = targetRef.current;
    if (!targetNode) return;
    const target = targetNode;

    function updatePosition(event: PointerEvent) {
      const rect = target.getBoundingClientRect();
      posRef.current.x = event.clientX - rect.left;
      posRef.current.y = event.clientY - rect.top;
    }

    target.addEventListener("pointerenter", updatePosition, { passive: true });
    target.addEventListener("pointermove", updatePosition, { passive: true });

    return () => {
      target.removeEventListener("pointerenter", updatePosition);
      target.removeEventListener("pointermove", updatePosition);
    };
  }, [targetRef]);

  // Resize canvas to match target
  useEffect(() => {
    const canvas = canvasRef.current;
    const target = targetRef.current;
    if (!canvas || !target) return;
    const canvasElement = canvas;
    const targetElement = target;

    function resize() {
      const rect = targetElement.getBoundingClientRect();
      canvasElement.width = rect.width;
      canvasElement.height = rect.height;
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(targetElement);
    return () => ro.disconnect();
  }, [targetRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    const context = ctx;

    function startLoop() {
      if (rafRef.current !== 0) {
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    function loop() {
      rafRef.current = 0;
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
      context.shadowBlur = 0;

      const palette = paletteRef.current;
      const { x: cx, y: cy } = posRef.current;

      // Spawn particles when active
      if (activeRef.current && canvasElement.width > 0) {
        const spawnCount = modeRef.current === "smoke" ? 2 : modeRef.current === "all" ? 4 : 3;
        for (let i = 0; i < spawnCount; i++) {
          if (particlesRef.current.length < 180) {
            particlesRef.current.push(spawnParticle(cx, cy, radius, palette, modeRef.current));
          }
        }

        // Draw cursor ring
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${palette[0][0]},${palette[0][1]},${palette[0][2]},0.22)`;
        context.lineWidth = 1.5;
        context.setLineDash([4, 6]);
        context.stroke();
        context.setLineDash([]);
      }

      // Update + draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.age += 1;
        if (p.age >= p.maxAge) return false;

        p.vx += p.turbX;
        p.vy += p.turbY;
        // Apply drag
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;

        drawParticle(context, p);
        return true;
      });

      if (activeRef.current || particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    startLoopRef.current = startLoop;
    startLoop();

    return () => {
      startLoopRef.current = null;

      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [radius]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    startLoopRef.current?.();
  }, [isActive, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        mixBlendMode: "screen",
      }}
      aria-hidden="true"
    />
  );
}
