import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

type FooterIconKind = "home" | "blog" | "projects" | "github" | "linkedin" | "x" | "portfolio" | "donate";

type FooterLinkItem = {
  href: string;
  label: string;
  seed: number;
  icon: FooterIconKind;
};

const navigationLinks: FooterLinkItem[] = [
  { href: "/", label: "Home", seed: 24, icon: "home" },
  { href: "/blog", label: "Blog", seed: 52, icon: "blog" },
  { href: "/projects", label: "Projects", seed: 78, icon: "projects" },
  { href: "/policy", label: "Policy", seed: 66, icon: "projects" },
];

const focusRules = [
  { label: "Capture ideas quickly.", seed: 13 },
  { label: "Ship weekly project notes.", seed: 37 },
  { label: "Keep writing clear and searchable.", seed: 61 },
];

const socialLinks: FooterLinkItem[] = [
  { href: "https://github.com/tph-kds", label: "GitHub", seed: 29, icon: "github" },
  { href: "https://x.com", label: "X", seed: 34, icon: "x" },
  { href: "https://www.linkedin.com/in/phihungtran", label: "LinkedIn", seed: 46, icon: "linkedin" },
  { href: "https://tph-kds.github.io/portfolio", label: "Portfolio", seed: 72, icon: "portfolio" },
  { href: "https://buymeacoffee.com", label: "Donate", seed: 85, icon: "donate" },
];

function FooterGlyph({ kind }: { kind: FooterIconKind }) {
  if (kind === "home") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2 4.5 10v9h5.6v-5.2h3.8V19h5.6v-9z" fill="currentColor" /></svg>;
  }

  if (kind === "blog") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  }

  if (kind === "projects") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.2h6.4v9.6H4.5zM13.1 7.2h6.4v4.2h-6.4zM13.1 13h6.4v3.8h-6.4z" fill="currentColor" /></svg>;
  }

  if (kind === "github") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5A9.7 9.7 0 0 0 2.3 12.3a9.8 9.8 0 0 0 6.6 9.2c.5.1.6-.2.6-.5v-2c-2.7.6-3.3-1.1-3.3-1.1-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 1 .1-.7.3-1.1.6-1.3-2.2-.3-4.5-1.1-4.5-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.6s.8-.3 2.7 1a9.4 9.4 0 0 1 4.8 0c1.9-1.3 2.7-1 2.7-1 .4 1 .2 2 .1 2.6a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.5 5 .4.3.7 1 .7 2v3c0 .3.1.6.6.5a9.8 9.8 0 0 0 6.6-9.2A9.7 9.7 0 0 0 12 2.5Z" fill="currentColor" /></svg>;
  }

  if (kind === "linkedin") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.1 8.4h3.3V19H5.1zM6.8 4.9a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8M10.2 8.4h3.2v1.4h.1c.5-.9 1.5-1.7 3.2-1.7 3.4 0 4 2.1 4 4.9V19h-3.3v-5.3c0-1.3 0-2.8-1.8-2.8s-2 1.3-2 2.7V19h-3.3z" fill="currentColor" /></svg>;
  }

  if (kind === "x") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.4 3h3.2l-7 8 8.2 10h-6.4l-5-6.2L4.7 21H1.5l7.5-8.6L1.1 3h6.5l4.5 5.7zM16.3 19h1.8L6.6 4.9H4.7z" fill="currentColor" /></svg>;
  }

  if (kind === "portfolio") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 7.5h16.4v10.7H3.8z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8.3 7.5V6.2h7.4v1.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3.8 12h16.4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-6.5-3.8-6.5-9.3a3.8 3.8 0 0 1 6.5-2.7 3.8 3.8 0 0 1 6.5 2.7c0 5.5-6.5 9.3-6.5 9.3Z" fill="currentColor" /></svg>;
}

function getHoverSeedStyle(seed: number) {
  return {
    "--rhombus-rotate": `${38 + (seed % 21)}deg`,
    "--rhombus-delay": `${(seed % 5) * -0.09}s`,
    "--rhombus-shift": `${5 + (seed % 7)}px`,
  } as CSSProperties;
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-panel site-footer-panel-expanded">
        <div className="site-footer-grid">
          <section>
            <p className="footer-brand-typing text-xs uppercase tracking-[0.2em] font-mono">
              <span className="sr-only">hob2log | Tran Phi Hung</span>
              <span className="footer-typing-line" aria-hidden="true">hob2log | Tran Phi Hung</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-(--muted)">
              Private workspace for writing, prototyping, discussing, and preserving engineering notes with intention and clarity.
            </p>
            <p className="footer-copyright mt-6 text-xs text-(--muted)">
              © {year} hob2log. All rights reserved.
            </p>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em]">Navigation</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {navigationLinks.map((item) => (
                <Link key={item.href} href={item.href} className="footer-hover-item footer-link-with-icon" style={getHoverSeedStyle(item.seed)}>
                  <span className="footer-link-icon" aria-hidden="true"><FooterGlyph kind={item.icon} /></span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em]">Focus Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-(--muted)">
              {focusRules.map((item) => (
                <li key={item.label} className="footer-hover-item" style={getHoverSeedStyle(item.seed)}>
                  {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em]">Social Network</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith("http") ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className="footer-hover-item footer-link-with-icon" style={getHoverSeedStyle(item.seed)}>
                      <span className="footer-link-icon" aria-hidden="true"><FooterGlyph kind={item.icon} /></span>
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link href={item.href} className="footer-hover-item footer-link-with-icon" style={getHoverSeedStyle(item.seed)}>
                      <span className="footer-link-icon" aria-hidden="true"><FooterGlyph kind={item.icon} /></span>
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="footer-support-panel">
            <p className="footer-label text-xs uppercase tracking-[0.2em]">Bonus / Donate</p>
            <p className="mt-3 text-sm text-(--muted)">Support this blog by scanning the QR code.</p>
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noreferrer"
              className="footer-qr-link"
              aria-label="Donate via QR"
            >
              <Image
                src="https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=https%3A%2F%2Fbuymeacoffee.com"
                alt="Donate QR code"
                width={128}
                height={128}
                unoptimized
                className="footer-qr-image"
                loading="lazy"
              />
            </a>
          </section>
        </div>
      </div>
    </footer>
  );
}
