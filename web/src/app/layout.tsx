import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { ProjectLogo } from "@/components/layout/project-logo";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { PageTransition } from "@/components/layout/page-transition";
import { ScrollProgressRing } from "@/components/layout/scroll-progress-ring";
import { SiteHeader } from "@/components/layout/site-header";
import { MusicProvider } from "@/components/music/music-provider";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const codeFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "hob2log",
  description: "Private blog for experiences, side projects, and visual experiments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootstrapScript = `
    (function () {
      try {
        var themeKey = "hob2log-theme";
        var themeValue = localStorage.getItem(themeKey);
        var allowedThemes = ["ocean", "sunset", "forest", "mono", "latte", "mocha", "sidewalk", "leather"];
        var theme = allowedThemes.indexOf(themeValue || "") >= 0 ? themeValue : "ocean";

        var motionKey = "hob2log-motion";
        var motionValue = localStorage.getItem(motionKey);
        var allowedMotions = ["system", "force"];
        var motion = allowedMotions.indexOf(motionValue || "") >= 0 ? motionValue : "system";

        var introKey = "hob2log-cinematic-intro";
        var introValue = localStorage.getItem(introKey);
        var allowedIntros = ["on", "off"];
        var cinematicIntro = allowedIntros.indexOf(introValue || "") >= 0 ? introValue : "on";

        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-motion", motion);
        document.documentElement.setAttribute("data-cinematic-intro", cinematicIntro);
      } catch (error) {
        document.documentElement.setAttribute("data-theme", "ocean");
        document.documentElement.setAttribute("data-motion", "system");
        document.documentElement.setAttribute("data-cinematic-intro", "on");
      }
    })();
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${headingFont.variable} ${codeFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <MusicProvider>
          <ProjectLogo />
          <SiteHeader />
          <PageTransition>{children}</PageTransition>
          <ScrollProgressRing />
          <ThemeSwitcher />
        </MusicProvider>
      </body>
    </html>
  );
}
