"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMusicPlayer } from "@/components/music/music-provider";

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

const POS_HORIZONTAL = { top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)", left: "50%", x: "-50%", y: "0%" } as const;
// "100% - 2.4rem": right edge of panel sits 2.4rem from viewport right
const POS_VERTICAL = { top: "50%", left: "calc(100% - 2.4rem)", x: "-100%", y: "-50%" } as const;

export function SiteHeader() {
  const [isDocked, setIsDocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileHeaderVisible, setIsMobileHeaderVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const pathname = usePathname();
  const { isPanelVisible, isExpanded, togglePanelVisible } = useMusicPlayer();

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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    let lastY = window.scrollY;

    function handleMobileHeaderVisibility() {
      if (!mq.matches) {
        setIsMobileHeaderVisible(true);
        return;
      }

      const nextY = window.scrollY;
      const delta = nextY - lastY;

      if (nextY <= 32) {
        setIsMobileHeaderVisible(true);
      } else if (delta > 7) {
        setIsMobileHeaderVisible(false);
      } else if (delta < -7) {
        setIsMobileHeaderVisible(true);
      }

      lastY = nextY;
    }

    function syncOnResize() {
      if (!mq.matches) {
        setIsMobileHeaderVisible(true);
      }
    }

    handleMobileHeaderVisibility();
    window.addEventListener("scroll", handleMobileHeaderVisibility, { passive: true });
    window.addEventListener("resize", syncOnResize);

    return () => {
      window.removeEventListener("scroll", handleMobileHeaderVisibility);
      window.removeEventListener("resize", syncOnResize);
    };
  }, [pathname]);

  const useVerticalDock = isDesktop && isDocked;
  const target = useVerticalDock ? POS_VERTICAL : POS_HORIZONTAL;
  const mobileHeaderStateClass = isMobileHeaderVisible ? "is-visible" : "is-collapsed";

  function isLinkActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <motion.header
        // position:fixed lives ONLY in CSS — Framer must never animate it.
        className={`site-header-motion z-[60] hidden md:block ${
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
          <div className={`flex ${useVerticalDock ? "site-header-desktop-vertical" : "items-center justify-center gap-3"}`}>
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
            <div className={`site-header-actions ${useVerticalDock ? "site-header-actions-vertical" : ""}`}>
              <button
                type="button"
                className={`site-header-icon-button ${isPanelVisible ? "is-active" : ""}`}
                aria-label={isPanelVisible ? "Hide music panel" : "Show music panel"}
                aria-pressed={isPanelVisible}
                onClick={togglePanelVisible}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="site-header-icon">
                  <path
                    d="M16.5 3v10.05a2.75 2.75 0 1 1-1.5-2.44V6.04l-6 1.35v7.66a2.75 2.75 0 1 1-1.5-2.44V5.18a1 1 0 0 1 .78-.98l7.5-1.7A.9.9 0 0 1 16.5 3Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div
        className={`mobile-tabbar md:hidden ${isExpanded ? "is-hidden" : ""} ${mobileHeaderStateClass}`}
        role="navigation"
        aria-label="Mobile primary navigation"
      >
        <div className="mobile-tabbar-panel">
          {links.map((link) => {
            const active = isLinkActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`mobile-tab-link ${active ? "is-active" : ""}`}
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-tab-route-pill"
                    className="mobile-tab-active-pill"
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "tween", duration: 0.24, ease: "linear" }
                    }
                  />
                ) : null}
                <span className="mobile-tab-link-label">{link.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            className={`mobile-tab-link mobile-tab-link-music ${isPanelVisible ? "is-active" : ""}`}
            aria-label={isPanelVisible ? "Hide music panel" : "Show music panel"}
            aria-pressed={isPanelVisible}
            onClick={togglePanelVisible}
          >
            <span aria-hidden="true" className="mobile-tab-link-icon">♪</span>
            <span className="mobile-tab-link-label">Audio</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`mobile-tabbar-toggle md:hidden ${isExpanded ? "is-hidden" : ""} ${mobileHeaderStateClass}`}
        aria-label={isMobileHeaderVisible ? "Hide mobile navigation" : "Show mobile navigation"}
        aria-expanded={isMobileHeaderVisible}
        onClick={() => setIsMobileHeaderVisible((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mobile-tabbar-toggle-icon">
          {isMobileHeaderVisible ? <path d="M6 10l6 6 6-6" /> : <path d="M6 14l6-6 6 6" />}
        </svg>
      </button>
    </>
  );
}
