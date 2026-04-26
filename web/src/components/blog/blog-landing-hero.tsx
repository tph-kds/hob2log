"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeroAnimatedCopy } from "@/components/hero/hero-animated-copy";

interface BlogLandingHeroProps {
  ctaHref?: string;
  ctaLabel?: string;
  scrollHint?: string;
}

function isCinematicIntroEnabled(value: string | null) {
  return value !== "off";
}

export function BlogLandingHero({ ctaHref = "#blog-entries", ctaLabel = "Explore Logs", scrollHint = "Scroll to discover more" }: BlogLandingHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const dropletTimerRef = useRef<number[]>([]);
  const lastBurstAtRef = useRef(0);
  const burstIdRef = useRef(0);
  const pointerRafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCinematicIntroEnabledState, setIsCinematicIntroEnabledState] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }

    const value = document.documentElement.getAttribute("data-cinematic-intro");
    return isCinematicIntroEnabled(value);
  });

  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);
  const cursorXPx = useMotionValue(0);
  const cursorYPx = useMotionValue(0);
  const shiftX = useMotionValue(0);
  const shiftY = useMotionValue(0);
  const [isHeroPointerInside, setIsHeroPointerInside] = useState(false);
  const [isTitleFocus, setIsTitleFocus] = useState(false);
  const [droplets, setDroplets] = useState<
    Array<{ id: number; x: number; y: number; dx: number; dy: number; size: number; duration: number; delay: number }>
  >([]);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const rotateX = useSpring(rotateXValue, { stiffness: 260, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rotateYValue, { stiffness: 260, damping: 24, mass: 0.5 });
  const dnaProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 22, mass: 0.5 });
  const depth = useTransform(rotateY, [-8, 8], [-14, 14]);
  const parallaxX = useSpring(shiftX, { stiffness: 220, damping: 24, mass: 0.55 });
  const parallaxY = useSpring(shiftY, { stiffness: 220, damping: 24, mass: 0.55 });
  const cursorXPxValue = useMotionTemplate`${cursorXPx}px`;
  const cursorYPxValue = useMotionTemplate`${cursorYPx}px`;
  const shiftXPx = useMotionTemplate`${parallaxX}px`;
  const shiftYPx = useMotionTemplate`${parallaxY}px`;
  const heroProgress = useTransform(dnaProgress, [0, 1], [0, 1]);
  const heroGradientShift = useTransform(dnaProgress, [0, 1], ["0%", "100%"]);
  const dnaRotateY = useTransform(dnaProgress, [0, 0.32, 0.64, 1], [0, 12, 22, 28]);
  const dnaRotateX = useTransform(dnaProgress, [0, 0.38, 0.74, 1], [0, 10, 20, 24]);
  const dnaRotateZ = useTransform(dnaProgress, [0, 0.36, 0.68, 1], [0, 28, 72, 92]);
  const dnaScale = useTransform(dnaProgress, [0, 0.38, 0.7, 1], [1, 1.08, 1.18, 1.05]);
  const dnaShiftX = useTransform(dnaProgress, [0, 0.3, 0.62, 1], [0, 22, 70, 126]);
  const dnaX = useTransform([depth, dnaShiftX], (values) => Number(values[0] ?? 0) + Number(values[1] ?? 0));
  const dnaTravelY = useTransform(dnaProgress, [0, 0.28, 0.6, 0.82, 1], [0, 40, 210, 376, 520]);
  const dnaZ = useTransform(dnaProgress, [0, 0.42, 0.74, 1], [0, 64, 168, 94]);
  const dnaOpacity = useTransform(dnaProgress, [0, 0.35, 0.72, 1], [0.95, 0.9, 0.78, 0.58]);
  const dnaHue = useTransform(dnaProgress, [0, 1], [0, 38]);
  const dnaSaturation = useTransform(dnaProgress, [0, 0.7, 1], [1, 1.24, 1.34]);
  const dnaBrightness = useTransform(dnaProgress, [0, 1], [1, 1.16]);
  const dnaFilter = useMotionTemplate`hue-rotate(${dnaHue}deg) saturate(${dnaSaturation}) brightness(${dnaBrightness})`;
  const proteinSpread = useTransform(scrollYProgress, [0.16, 0.9], [0, 148]);
  const proteinOpacity = useTransform(scrollYProgress, [0.1, 0.32, 0.9, 1], [0.1, 0.88, 0.42, 0]);
  const proteinSpreadPx = useMotionTemplate`${proteinSpread}px`;

  const dnaNodes = useMemo(() => Array.from({ length: 18 }, (_, index) => index), []);
  const dnaColumns = useMemo(
    () => [
      { id: "primary", delayOffset: 0, className: "blog-landing-dna-column-primary" },
      { id: "secondary", delayOffset: -0.42, className: "blog-landing-dna-column-secondary" },
      { id: "tertiary", delayOffset: -0.84, className: "blog-landing-dna-column-tertiary" },
    ],
    []
  );
  const proteins = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = (index / 24) * Math.PI * 2;
        const radius = 0.5 + ((index % 7) / 7) * 0.9;
        return {
          id: `protein-${index}`,
          vx: Math.cos(angle) * radius,
          vy: Math.sin(angle) * radius,
          size: 5 + (index % 5),
          delay: -index * 0.1,
        };
      }),
    []
  );

  useEffect(() => {
    return () => {
      if (pointerRafRef.current !== null) {
        window.cancelAnimationFrame(pointerRafRef.current);
      }

      dropletTimerRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      dropletTimerRef.current = [];
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const observer = new MutationObserver(() => {
      const value = root.getAttribute("data-cinematic-intro");
      setIsCinematicIntroEnabledState(isCinematicIntroEnabled(value));
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-cinematic-intro"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-home-no-blur", "true");

    return () => {
      document.body.removeAttribute("data-home-no-blur");
    };
  }, []);

  if (!isCinematicIntroEnabledState) {
    return null;
  }

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    if (prefersReducedMotion || !heroRef.current) {
      return;
    }

    pendingPointerRef.current = { x: event.clientX, y: event.clientY };

    if (pointerRafRef.current !== null) {
      return;
    }

    pointerRafRef.current = window.requestAnimationFrame(() => {
      pointerRafRef.current = null;

      if (!heroRef.current || !pendingPointerRef.current) {
        return;
      }

      const bounds = heroRef.current.getBoundingClientRect();
      const pointerX = pendingPointerRef.current.x - bounds.left;
      const pointerY = pendingPointerRef.current.y - bounds.top;
      const normalizedX = (pointerX / bounds.width) * 2 - 1;
      const normalizedY = (pointerY / bounds.height) * 2 - 1;

      rotateYValue.set(normalizedX * 8);
      rotateXValue.set(normalizedY * -7);
      cursorXPx.set(pointerX);
      cursorYPx.set(pointerY);
      shiftX.set(normalizedX * 18);
      shiftY.set(normalizedY * 14);
    });
  }

  function spawnDropletBurst(event: PointerEvent<HTMLElement>) {
    if (!heroRef.current || prefersReducedMotion) {
      return;
    }

    const now = performance.now();

    if (now - lastBurstAtRef.current < 84) {
      return;
    }

    lastBurstAtRef.current = now;

    const bounds = heroRef.current.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;

    const newBursts = Array.from({ length: 3 }, () => {
      const id = burstIdRef.current++;
      const angle = (Math.random() * Math.PI * 1.2) - Math.PI * 0.6;
      const speed = 28 + Math.random() * 92;
      const duration = 520 + Math.random() * 440;
      const burst = {
        id,
        x: localX + (Math.random() * 24 - 12),
        y: localY + (Math.random() * 18 - 9),
        dx: Math.cos(angle) * speed,
        dy: Math.abs(Math.sin(angle)) * speed + Math.random() * 32,
        size: 3 + Math.random() * 5,
        duration,
        delay: Math.random() * 90,
      };

      const timerId = window.setTimeout(() => {
        setDroplets((current) => current.filter((item) => item.id !== id));
      }, duration + burst.delay + 40);

      dropletTimerRef.current.push(timerId);

      return burst;
    });

    setDroplets((current) => {
      const merged = [...current, ...newBursts];
      return merged.length > 28 ? merged.slice(merged.length - 28) : merged;
    });
  }

  function handleHeroPointerEnter(event: PointerEvent<HTMLElement>) {
    setIsHeroPointerInside(true);

    if (!heroRef.current) {
      return;
    }

    const bounds = heroRef.current.getBoundingClientRect();
    cursorXPx.set(event.clientX - bounds.left);
    cursorYPx.set(event.clientY - bounds.top);
  }

  function handleTitlePointerMove(event: PointerEvent<HTMLElement>) {
    setIsTitleFocus(true);
    spawnDropletBurst(event);
  }

  function handleTitlePointerEnter() {
    setIsTitleFocus(true);
  }

  function handleTitlePointerLeave() {
    setIsTitleFocus(false);
  }

  function handleHeroPointerLeave() {
    pendingPointerRef.current = null;

    if (pointerRafRef.current !== null) {
      window.cancelAnimationFrame(pointerRafRef.current);
      pointerRafRef.current = null;
    }

    setIsHeroPointerInside(false);
    setIsTitleFocus(false);

    if (prefersReducedMotion) {
      return;
    }

    rotateXValue.set(0);
    rotateYValue.set(0);
    cursorXPx.set(0);
    cursorYPx.set(0);
    shiftX.set(0);
    shiftY.set(0);
  }

  return (
    <motion.section
      ref={heroRef}
      className={`blog-landing-hero rounded-3xl ${isHeroPointerInside ? "is-hero-hover" : ""} ${isTitleFocus ? "is-title-focus" : ""} `}
      onPointerEnter={handleHeroPointerEnter}
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        "--hero-cursor-x-px": cursorXPxValue,
        "--hero-cursor-y-px": cursorYPxValue,
        "--hero-shift-x": prefersReducedMotion ? "0px" : shiftXPx,
        "--hero-shift-y": prefersReducedMotion ? "0px" : shiftYPx,
        "--hero-progress": heroProgress,
        "--hero-gradient-shift": heroGradientShift,
        "--dna-transfer-progress": heroProgress,
      } as CSSProperties}
    >
      <div className="hero-cursor-orb" aria-hidden="true" />
      <div className="blog-landing-hero-backdrop" aria-hidden="true" />
      <div className="blog-landing-noise" aria-hidden="true" />

      <motion.div
        className="blog-landing-dna"
        style={{
          x: prefersReducedMotion ? 0 : dnaX,
          y: prefersReducedMotion ? 0 : dnaTravelY,
          z: prefersReducedMotion ? 0 : dnaZ,
          rotateX: prefersReducedMotion ? 0 : dnaRotateX,
          rotateY: prefersReducedMotion ? 0 : dnaRotateY,
          rotateZ: prefersReducedMotion ? 0 : dnaRotateZ,
          scale: prefersReducedMotion ? 1 : dnaScale,
          opacity: prefersReducedMotion ? 0.8 : dnaOpacity,
          filter: prefersReducedMotion ? "none" : dnaFilter,
        }}
        aria-hidden="true"
      >
        <div className="blog-landing-dna-strand">
          {dnaColumns.map((column) => (
            <div key={column.id} className={`blog-landing-dna-column ${column.className}`}>
              {dnaNodes.map((nodeIndex) => (
                <div
                  key={`${column.id}-${nodeIndex}`}
                  className="dna-rung"
                  style={{
                    animationDelay: `${(nodeIndex * -0.24) + column.delayOffset}s`,
                    top: `${(nodeIndex / (dnaNodes.length - 1)) * 100}%`,
                  }}
                >
                  <span className="dna-node dna-node-left" />
                  <span className="dna-link" />
                  <span className="dna-node dna-node-right" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="blog-landing-protein-cloud"
        aria-hidden="true"
        style={{
          opacity: proteinOpacity,
          "--protein-spread": proteinSpreadPx,
        } as unknown as CSSProperties}
      >
        {proteins.map((protein) => (
          <span
            key={protein.id}
            className="protein-node"
            style={
              {
                "--vx": protein.vx,
                "--vy": protein.vy,
                "--protein-size": `${protein.size}px`,
                "--protein-delay": `${protein.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </motion.div>

      <HeroAnimatedCopy
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        scrollHint={scrollHint}
        onTitlePointerMove={handleTitlePointerMove}
        onTitlePointerEnter={handleTitlePointerEnter}
        onTitlePointerLeave={handleTitlePointerLeave}
      />

      <div className="hero-water-burst-layer" aria-hidden="true">
        {droplets.map((droplet) => (
          <span
            key={droplet.id}
            className="hero-water-burst"
            style={
              {
                left: `${droplet.x}px`,
                top: `${droplet.y}px`,
                "--drop-dx": `${droplet.dx}px`,
                "--drop-dy": `${droplet.dy}px`,
                "--drop-size": `${droplet.size}px`,
                "--drop-duration": `${droplet.duration}ms`,
                "--drop-delay": `${droplet.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </motion.section>
  );
}
