"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prevRef = useRef(pathname);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    if (prevRef.current !== pathname) {
      prevRef.current = pathname;
      setSweeping(true);
      const t = setTimeout(() => setSweeping(false), 640);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {sweeping && (
          <motion.div
            key="page-sweep"
            className="page-transition-sweep"
            initial={{ scaleX: 0, transformOrigin: "left center" }}
            animate={{ scaleX: 1, transformOrigin: "left center" }}
            exit={{ scaleX: 0, transformOrigin: "right center" }}
            transition={{ duration: 0.28, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
