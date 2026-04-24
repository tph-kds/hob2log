"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function ProjectLogo() {
  const pathname = usePathname();
  const [isAtTop, setIsAtTop] = useState(true);

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

  return (
    <Link
      href="/"
      className={`site-logo-permanent leading-none ${isAtTop ? "is-at-top" : "is-hidden"}`}
      aria-label="Tran Phi Hung Blog"
    >
      <span data-text="Tran Phi Hung Blog" className="site-logo-title-enhanced text-lg font-semibold tracking-tight md:text-3xl">
        Tran Phi Hung Blog
      </span>
    </Link>
  );
}
