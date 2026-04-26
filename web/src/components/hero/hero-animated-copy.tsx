"use client";

import Link from "next/link";
import gsap from "gsap";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LiquidDistortionCanvas } from "@/components/hero/liquid-distortion-canvas";
import { ParticleSmokeCanvas, type EffectMode } from "@/components/hero/particle-smoke-canvas";

interface HeroAnimatedCopyProps {
  ctaHref: string;
  ctaLabel: string;
  scrollHint: string;
  onTitlePointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onTitlePointerEnter?: () => void;
  onTitlePointerLeave?: () => void;
}

const ROLE_PARAGRAPHS = [
  {
    text: "Documenting how ideas evolve into dependable systems, from multimodal AI prototypes to production deployments with clarity, scalability, and measurable outcomes.",
    inspiredBy: "Elon Musk",
  },
  {
    text: "Designing and engineering intelligent products where research informs implementation, turning vague challenges into structured, testable, and deployable solutions.",
    inspiredBy: "Steve Jobs",
  },
  {
    text: "Publishing disciplined build journals where experiments, trade-offs, and failures become reusable engineering knowledge that compounds over time.",
    inspiredBy: "Jeff Bezos",
  },
  {
    text: "Turning AI progress into repeatable practice through iteration, instrumentation, and execution discipline rather than isolated breakthroughs.",
    inspiredBy: "Andrew Ng",
  },
  {
    text: "Building systems that keep people in the loop, using intelligence to amplify human judgment, learning, and practical decision-making.",
    inspiredBy: "Fei-Fei Li",
  },
  {
    text: "Favoring architectural leaps over incremental patches, designing platforms that solve classes of problems at a fundamentally larger scale.",
    inspiredBy: "Jensen Huang",
  },
  {
    text: "Focusing on execution consistency, because durable products are built through repeated delivery quality, not career optics.",
    inspiredBy: "Jensen Huang (Execution Mindset)",
  },
  {
    text: "Pursuing ambitious technical targets that raise the engineering bar, since breakthrough outcomes rarely come from timid roadmaps.",
    inspiredBy: "Lisa Su",
  },
  {
    text: "Staying resilient through failures and recovering fast, treating persistence and adaptation as core capabilities in long-horizon systems.",
    inspiredBy: "Jack Ma",
  },
];

const SUBTITLE = "Every line of code is a hypothesis where ideas are pressure-tested. Iteration, failures, and refinement transform rough experiments into dependable products. Control, creativity, and execution discipline shape how concepts become reliable systems";
const TITLE = "Trần Phi Hùng";
const ROLE_ROTATION_MS = 5200;

const EFFECT_MODES: { id: EffectMode; label: string; icon: string }[] = [
  { id: "all",   label: "All",   icon: "✦" },
  { id: "smoke", label: "Smoke", icon: "◎" },
  { id: "spark", label: "Spark", icon: "✸" },
  { id: "ember", label: "Ember", icon: "🔥" },
  { id: "frost", label: "Frost", icon: "❄" },
];

function splitCharacters(value: string) {
  return Array.from(value);
}

export function HeroAnimatedCopy({
  ctaHref,
  ctaLabel,
  scrollHint,
  onTitlePointerMove,
  onTitlePointerEnter,
  onTitlePointerLeave,
}: HeroAnimatedCopyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [effectMode, setEffectMode] = useState<EffectMode>("all");
  const prefersReducedMotion = useReducedMotion();

  const subtitleLines = useMemo(
    () => [
      "Every line of code is a hypothesis where ideas are pressure-tested.",
      "Iteration, failures, and refinement transform rough experiments into dependable products.",
      "Control, creativity, and execution discipline shape how concepts become reliable systems",
    ],
    []
  );
  const titleChars = useMemo(() => splitCharacters(TITLE), []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      const wordNodes = root.querySelectorAll("[data-reveal-word]");
      const charNodes = root.querySelectorAll("[data-reveal-char]");
      const paragraphNodes = root.querySelectorAll("[data-reveal-paragraph]");
      const ctaNodes = root.querySelectorAll("[data-reveal-cta]");

      gsap.set(wordNodes, { opacity: 0, y: 26, filter: "blur(8px)" });
      gsap.set(charNodes, { opacity: 0, yPercent: 110, rotateX: -60, transformOrigin: "50% 100%" });
      gsap.set(paragraphNodes, { opacity: 0, y: 20, filter: "blur(6px)" });
      gsap.set(ctaNodes, { opacity: 0, y: 18 });

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline.to(charNodes, { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.82, stagger: 0.028 });
      timeline.to(wordNodes, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.62, stagger: 0.06 }, "-=0.48");
      timeline.to(paragraphNodes, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.54, stagger: 0.1 }, "-=0.24");
      timeline.to(ctaNodes, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, "-=0.2");
    }, root);

    return () => { context.revert(); };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRoleIndex((current) => (current + 1) % ROLE_PARAGRAPHS.length);
    }, ROLE_ROTATION_MS);
    return () => { window.clearInterval(intervalId); };
  }, []);

  function handleTitlePointerMove(event: PointerEvent<HTMLElement>) {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    target.style.setProperty("--title-cursor-x", `${localX}px`);
    target.style.setProperty("--title-cursor-y", `${localY}px`);
    onTitlePointerMove?.(event);
  }

  function handleTitlePointerEnter(event: PointerEvent<HTMLElement>) {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    target.style.setProperty("--title-cursor-x", `${localX}px`);
    target.style.setProperty("--title-cursor-y", `${localY}px`);
    setIsTitleHovered(true);
    onTitlePointerEnter?.();
  }

  function handleTitlePointerLeave() {
    setIsTitleHovered(false);
    onTitlePointerLeave?.();
  }

  return (
    <div ref={rootRef} className="blog-landing-content">
      <p className="blog-landing-kicker" data-reveal-word>
        Engineering Journal
      </p>

      <h1
        ref={titleRef}
        className="cursor-reactive-title hero-title-split"
        aria-label={TITLE}
        onPointerMove={handleTitlePointerMove}
        onPointerEnter={handleTitlePointerEnter}
        onPointerLeave={handleTitlePointerLeave}
      >
        <LiquidDistortionCanvas targetRef={titleRef} radius={120} isActive={isTitleHovered && !prefersReducedMotion} />
        {!prefersReducedMotion && (
          <ParticleSmokeCanvas
            targetRef={titleRef}
            radius={110}
            isActive={isTitleHovered}
            mode={effectMode}
          />
        )}
        {titleChars.map((character, index) => (
          <span key={`${character}-${index}`} data-reveal-char className="hero-title-char" aria-hidden="true">
            {character === " " ? "\u00A0" : character}
          </span>
        ))}
      </h1>

      {/* Effect mode toggle row */}
      {!prefersReducedMotion && (
        <div className="hero-effect-mode-row" data-reveal-word aria-label="Hover effect mode">
          {EFFECT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`hero-effect-chip ${effectMode === m.id ? "is-active" : ""}`}
              onClick={() => setEffectMode(m.id)}
              aria-pressed={effectMode === m.id}
              title={`${m.label} effect`}
            >
              <span aria-hidden="true">{m.icon}</span>
              <span className="hero-effect-chip-label">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="blog-landing-subtitle-shell" data-reveal-paragraph>
        <p className="blog-landing-subtitle" aria-label={SUBTITLE}>
          {subtitleLines.map((line, index) => (
            <span key={`${line}-${index}`} data-line={line} data-reveal-word className="hero-subtitle-line">
              {line}
            </span>
          ))}
        </p>
      </div>

      <div className="blog-landing-roles">
        <div data-reveal-paragraph className="blog-landing-roles-viewport" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${ROLE_PARAGRAPHS[roleIndex]?.text}-${ROLE_PARAGRAPHS[roleIndex]?.inspiredBy}`}
              className="hero-role-rotating-line"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, clipPath: "inset(0 50% 0 50% round 0.8rem)", filter: "blur(6px)", scale: 0.985 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, clipPath: "inset(0 0% 0 0% round 0.8rem)", filter: "blur(0px)", scale: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, clipPath: "inset(0 50% 0 50% round 0.8rem)", filter: "blur(6px)", scale: 0.985 }
              }
              transition={{ duration: prefersReducedMotion ? 0.22 : 0.78, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="hero-role-quote">{`"${ROLE_PARAGRAPHS[roleIndex]?.text}"`}</span>
              <em className="hero-role-inspired-by">Inspired by {ROLE_PARAGRAPHS[roleIndex]?.inspiredBy}</em>
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="blog-landing-actions">
        <Link href={ctaHref} className="dynamic-theme-button theme-solid-button-text rounded-full px-6 py-3 font-semibold" data-reveal-cta>
          {ctaLabel}
        </Link>
        <span className="blog-landing-scroll-hint" data-reveal-cta>
          {scrollHint}
        </span>
      </div>
    </div>
  );
}
