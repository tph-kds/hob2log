"use client";

import Link from "next/link";
import gsap from "gsap";
import type { PointerEvent } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";

interface HeroAnimatedCopyProps {
  ctaHref: string;
  ctaLabel: string;
  scrollHint: string;
  onTextPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onTextPointerEnter?: () => void;
  onTextPointerLeave?: () => void;
}

const ROLE_PARAGRAPHS = [
  "I architect and deliver production-ready systems, turning ambiguous ideas into software with clear structure and momentum.",
  "I work where product thinking meets engineering craft, using visual depth and interaction to make complex concepts feel intuitive.",
  "I publish concrete build logs so every experiment, trade-off, and outcome compounds into better execution.",
];

const SUBTITLE = "First, a solid foundation. Then experiments become systems.";
const TITLE = "Trần Phi Hùng";

function splitWords(value: string) {
  return value.split(/\s+/).filter(Boolean);
}

function splitCharacters(value: string) {
  return Array.from(value);
}

export function HeroAnimatedCopy({
  ctaHref,
  ctaLabel,
  scrollHint,
  onTextPointerMove,
  onTextPointerEnter,
  onTextPointerLeave,
}: HeroAnimatedCopyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const subtitleWords = useMemo(() => splitWords(SUBTITLE), []);
  const titleChars = useMemo(() => splitCharacters(TITLE), []);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

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

      timeline.to(charNodes, {
        opacity: 1,
        yPercent: 0,
        rotateX: 0,
        duration: 0.82,
        stagger: 0.028,
      });

      timeline.to(
        wordNodes,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.62,
          stagger: 0.06,
        },
        "-=0.48"
      );

      timeline.to(
        paragraphNodes,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.54,
          stagger: 0.1,
        },
        "-=0.24"
      );

      timeline.to(
        ctaNodes,
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
        },
        "-=0.2"
      );
    }, root);

    return () => {
      context.revert();
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onTextPointerMove?.(event);
  }

  function handlePointerLeave() {
    onTextPointerLeave?.();
  }

  return (
    <div
      ref={rootRef}
      className="blog-landing-content"
      onPointerMove={handlePointerMove}
      onPointerEnter={onTextPointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <p className="blog-landing-kicker" data-reveal-word>
        Engineering Journal
      </p>

      <h1 className="cursor-reactive-title hero-title-split" aria-label={TITLE}>
        {titleChars.map((character, index) => (
          <span key={`${character}-${index}`} data-reveal-char className="hero-title-char" aria-hidden="true">
            {character === " " ? "\u00A0" : character}
          </span>
        ))}
      </h1>

      <p className="blog-landing-subtitle hero-subtitle-words" aria-label={SUBTITLE}>
        {subtitleWords.map((word, index) => (
          <span key={`${word}-${index}`} data-reveal-word className="hero-subtitle-word" aria-hidden="true">
            {word}
          </span>
        ))}
      </p>

      <div className="blog-landing-roles">
        {ROLE_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph} data-reveal-paragraph>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="blog-landing-actions">
        <Link href={ctaHref} className="dynamic-theme-button rounded-full px-6 py-3 font-semibold text-slate-950" data-reveal-cta>
          {ctaLabel}
        </Link>
        <span className="blog-landing-scroll-hint" data-reveal-cta>
          {scrollHint}
        </span>
      </div>
    </div>
  );
}
