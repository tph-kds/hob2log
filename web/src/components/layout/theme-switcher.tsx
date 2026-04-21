"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "hob2log-theme";
const MOTION_STORAGE_KEY = "hob2log-motion";
const CINEMATIC_INTRO_STORAGE_KEY = "hob2log-cinematic-intro";

type MotionPreference = "system" | "force";
type CinematicIntroPreference = "on" | "off";

interface ThemeOption {
  id: string;
  label: string;
  swatch: string;
}

const themeLibrary: ThemeOption[] = [
  { id: "ocean", label: "Ocean Glass", swatch: "linear-gradient(130deg, #7fd8ff, #99ffd9)" },
  { id: "sunset", label: "Sunset Ember", swatch: "linear-gradient(130deg, #ffbf7d, #ff6f95)" },
  { id: "forest", label: "Forest Mist", swatch: "linear-gradient(130deg, #9be9bc, #79d8ff)" },
  { id: "mono", label: "Mono Aurora", swatch: "linear-gradient(130deg, #c8d3e6, #9bb3d3)" },
  { id: "latte", label: "Latte Pastel", swatch: "linear-gradient(130deg, #f6e6cf, #d9d9f8)" },
  { id: "mocha", label: "Mocha Night", swatch: "linear-gradient(130deg, #8c6f5d, #6b78b8)" },
  { id: "sidewalk", label: "Sidewalk Chilling", swatch: "linear-gradient(130deg, #867e32, #d2eaf1)" },
  { id: "leather", label: "Italian Leather", swatch: "linear-gradient(130deg, #4a3a2f, #b78a61)" },
];

function isThemeId(value: string | null): value is string {
  return Boolean(value && themeLibrary.some((theme) => theme.id === value));
}

function setDocumentTheme(themeId: string) {
  document.documentElement.setAttribute("data-theme", themeId);
}

function isMotionPreference(value: string | null): value is MotionPreference {
  return value === "system" || value === "force";
}

function setDocumentMotion(motion: MotionPreference) {
  document.documentElement.setAttribute("data-motion", motion);
}

function isCinematicIntroPreference(value: string | null): value is CinematicIntroPreference {
  return value === "on" || value === "off";
}

function setDocumentCinematicIntro(preference: CinematicIntroPreference) {
  document.documentElement.setAttribute("data-cinematic-intro", preference);
}

export function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof document === "undefined") {
      return "ocean";
    }

    const currentTheme = document.documentElement.getAttribute("data-theme");
    return isThemeId(currentTheme) ? currentTheme : "ocean";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [motionPreference, setMotionPreference] = useState<MotionPreference>(() => {
    if (typeof document === "undefined") {
      return "system";
    }

    const currentMotion = document.documentElement.getAttribute("data-motion");
    return isMotionPreference(currentMotion) ? currentMotion : "system";
  });
  const [cinematicIntro, setCinematicIntro] = useState<CinematicIntroPreference>(() => {
    if (typeof document === "undefined") {
      return "on";
    }

    const currentPreference = document.documentElement.getAttribute("data-cinematic-intro");
    return isCinematicIntroPreference(currentPreference) ? currentPreference : "on";
  });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const resolvedTheme = isThemeId(storedTheme) ? storedTheme : "ocean";
    const storedMotion = localStorage.getItem(MOTION_STORAGE_KEY);
    const resolvedMotion = isMotionPreference(storedMotion) ? storedMotion : "system";
    const storedIntro = localStorage.getItem(CINEMATIC_INTRO_STORAGE_KEY);
    const resolvedIntro = isCinematicIntroPreference(storedIntro) ? storedIntro : "on";

    setDocumentTheme(resolvedTheme);
    setDocumentMotion(resolvedMotion);
    setDocumentCinematicIntro(resolvedIntro);
  }, []);

  const selectedTheme = useMemo(() => {
    return themeLibrary.find((theme) => theme.id === activeTheme) ?? themeLibrary[0];
  }, [activeTheme]);

  function handleThemeChange(themeId: string) {
    setActiveTheme(themeId);
    setDocumentTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    setIsOpen(false);
  }

  function handleMotionChange(motion: MotionPreference) {
    setMotionPreference(motion);
    setDocumentMotion(motion);
    localStorage.setItem(MOTION_STORAGE_KEY, motion);
  }

  function handleCinematicIntroChange(preference: CinematicIntroPreference) {
    setCinematicIntro(preference);
    setDocumentCinematicIntro(preference);
    localStorage.setItem(CINEMATIC_INTRO_STORAGE_KEY, preference);
  }

  return (
    <div className="theme-fab-wrap" aria-label="Theme selection">
      <AnimatePresence>
        {isOpen ? (
          <motion.section
            className="theme-fab-panel"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <p className="theme-library-label">Theme Library</p>
            <div className="theme-options" role="listbox" aria-label="Choose visual theme">
              {themeLibrary.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-chip ${activeTheme === theme.id ? "is-active" : ""}`}
                  onClick={() => handleThemeChange(theme.id)}
                  aria-label={`Switch to ${theme.label}`}
                  aria-selected={activeTheme === theme.id}
                  role="option"
                >
                  <span className="theme-chip-swatch" style={{ backgroundImage: theme.swatch }} aria-hidden="true" />
                  <span className="theme-chip-text">{theme.label}</span>
                </button>
              ))}
            </div>
            <div className="theme-motion-controls mt-3">
              <p className="theme-library-label">Motion Mode</p>
              <div className="theme-options mt-1" role="radiogroup" aria-label="Animation motion mode">
                <button
                  type="button"
                  role="radio"
                  aria-checked={motionPreference === "system"}
                  className={`theme-chip ${motionPreference === "system" ? "is-active" : ""}`}
                  onClick={() => handleMotionChange("system")}
                >
                  <span className="theme-chip-text">System</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={motionPreference === "force"}
                  className={`theme-chip ${motionPreference === "force" ? "is-active" : ""}`}
                  onClick={() => handleMotionChange("force")}
                >
                  <span className="theme-chip-text">Force</span>
                </button>
              </div>
            </div>
            <div className="theme-motion-controls mt-3">
              <p className="theme-library-label">Home Cinematic Intro</p>
              <div className="theme-options mt-1" role="radiogroup" aria-label="Home cinematic intro mode">
                <button
                  type="button"
                  role="radio"
                  aria-checked={cinematicIntro === "on"}
                  className={`theme-chip ${cinematicIntro === "on" ? "is-active" : ""}`}
                  onClick={() => handleCinematicIntroChange("on")}
                >
                  <span className="theme-chip-text">On</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={cinematicIntro === "off"}
                  className={`theme-chip ${cinematicIntro === "off" ? "is-active" : ""}`}
                  onClick={() => handleCinematicIntroChange("off")}
                >
                  <span className="theme-chip-text">Off</span>
                </button>
              </div>
            </div>
            <p className="theme-active-readout">Selected: {selectedTheme.label}</p>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        className="theme-fab-button"
        aria-label={isOpen ? "Close theme library" : "Open theme library"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" className="theme-fab-icon" aria-hidden="true">
          <path
            d="M12 3c-4.97 0-9 3.58-9 8 0 2.5 1.28 4.75 3.29 6.22.35.26.56.67.56 1.11v1.67A1 1 0 0 0 7.85 21h2.8a1 1 0 0 0 .95-1.32l-.4-1.2a1.1 1.1 0 0 1 .79-1.44A8.95 8.95 0 0 0 21 11c0-4.42-4.03-8-9-8Zm-4 8.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4-2.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4 2.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
