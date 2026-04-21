"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
];

export function SiteHeader() {
  const [isDocked, setIsDocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    function handleViewport() {
      setIsDesktop(window.matchMedia("(min-width: 960px)").matches);
    }

    handleViewport();
    window.addEventListener("resize", handleViewport);

    return () => {
      window.removeEventListener("resize", handleViewport);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    function handleScroll() {
      const workspaceBlock = document.querySelector(".page-main");

      if (!workspaceBlock) {
        setIsDocked(window.scrollY > 180);
        return;
      }

      const workspaceTop = workspaceBlock.getBoundingClientRect().top + window.scrollY;
      const dockThreshold = workspaceTop + 40;
      setIsDocked(window.scrollY > dockThreshold);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isDesktop]);

  const useVerticalDock = isDesktop && isDocked;
  const themeFabAxisX = "calc(100% - 2.55rem)";

  return (
    <motion.header
      className={`site-header-motion z-30 ${useVerticalDock ? "site-header-vertical" : "site-header-horizontal"}`}
      animate={
        useVerticalDock
          ? { top: "50%", left: themeFabAxisX, x: "-50%", y: "-50%" }
          : { top: "1.1rem", left: "50%", x: "-50%", y: 0 }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 210, damping: 28, mass: 0.8 }
      }
    >
      <div className="site-nav-panel site-nav-separated mx-auto w-fit rounded-2xl px-4 py-3 md:px-5">
        <div className="flex items-center justify-center gap-4">
          <nav className={`hidden md:flex md:pr-1 ${useVerticalDock ? "site-nav-links-vertical" : "site-nav-links-horizontal"}`}>
            {links.map((link, index) => (
              <div key={link.href} className="nav-link-item">
                <Link href={link.href} className="nav-water-link rounded-full px-4 py-2 text-sm">
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