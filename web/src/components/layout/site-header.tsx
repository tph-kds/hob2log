"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
];

// ─── Position targets ───────────────────────────────────────────────────────
// Framer Motion reliably animates: px, %, rem, em.
// DO NOT use vw/vh in animate — they fail to interpolate from 'auto'.
//
// With position:fixed the containing block IS the viewport, so:
//   left: "50%"   ≡  50vw  (horizontal centre with x:"-50%")
//   left: "100%"  ≡  100vw (right edge; x:"-100%" pulls full-width back)
//   top:  "50%"   ≡  50vh  (vertical centre with y:"-50%")

const POS_HORIZONTAL = { top: "1.1rem", left: "50%", x: "-50%", y: "0%" } as const;
// "100% - 2.4rem": right edge of panel sits 2.4rem from viewport right
const POS_VERTICAL = { top: "50%", left: "calc(100% - 2.4rem)", x: "-100%", y: "-50%" } as const;

export function SiteHeader() {
  const [isDocked, setIsDocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const pathname = usePathname();

  // ── 1. Responsive breakpoint listener ──────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    function sync() {
      setIsDesktop(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── 2. Scroll detector: dock ↔ un-dock ──────────────────────────────────────
  useEffect(() => {
    if (!isDesktop) {
      setIsDocked(false);
      return;
    }

    function evaluate() {
      // By using window.scrollY, it will always be horizontal when at the top of the page
      // (Scroll position 0), and correctly vertical continuously when scrolling down.
      setIsDocked(window.scrollY > 80);
    }

    // Call once immediately, and also set a slight delay to account for Next.js 
    // scroll-to-top rendering upon navigation route change.
    evaluate();
    const timeout = setTimeout(evaluate, 100);

    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("resize", evaluate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, [isDesktop, pathname]);

  const useVerticalDock = isDesktop && isDocked;
  const target = useVerticalDock ? POS_VERTICAL : POS_HORIZONTAL;

  return (
    <motion.header
      // position:fixed lives ONLY in CSS — Framer must never animate it.
      className={`site-header-motion z-[60] ${
        useVerticalDock ? "site-header-vertical" : "site-header-horizontal"
      }`}
      // initial mirrors horizontal so Framer has a concrete start for the first transition.
      // Without this, Framer reads "auto" from CSS and fails to interpolate.
      initial={POS_HORIZONTAL}
      animate={target}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 200, damping: 26, mass: 0.85 }
      }
    >
      <div className="site-nav-panel site-nav-separated mx-auto w-fit rounded-2xl px-4 py-3 md:px-5">

        {/* ── Desktop nav ─────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center justify-center gap-4">
          <nav
            className={`flex md:pr-1 ${
              useVerticalDock
                ? "site-nav-links-vertical"
                : "site-nav-links-horizontal"
            }`}
          >
            {links.map((link, index) => (
              <div key={link.href} className="nav-link-item">
                <Link
                  href={link.href}
                  className="nav-water-link rounded-full px-4 py-2 text-sm"
                >
                  {link.label}
                </Link>

                {index < links.length - 1 && !useVerticalDock ? (
                  <span aria-hidden="true" className="nav-water-bridge">
                    <span className="nav-water-stream" />
                    <span className="nav-water-drop nav-water-drop-a" />
                    <span className="nav-water-drop nav-water-drop-b" />
                    <span className="nav-water-drop nav-water-drop-c" />
                  </span>
                ) : null}
              </div>
            ))}
          </nav>
        </div>

        {/* ── Mobile nav (always horizontal) ──────────────────────────── */}
        <nav className="mt-3 flex items-center justify-between gap-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="w-full rounded-full border border-white/10 px-3 py-2 text-center text-xs uppercase tracking-[0.12em] text-slate-100/90 transition hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>

      </div>
    </motion.header>
  );
}