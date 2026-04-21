import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const navigationLinks = [
  { href: "/", label: "Home", seed: 24 },
  { href: "/blog", label: "Blog", seed: 52 },
  { href: "/projects", label: "Projects", seed: 78 },
];

const focusRules = [
  { label: "Capture ideas quickly.", seed: 13 },
  { label: "Ship weekly project notes.", seed: 37 },
  { label: "Keep writing clear and searchable.", seed: 61 },
];

const socialLinks = [
  { href: "https://github.com", label: "GitHub", seed: 29 },
  { href: "https://www.linkedin.com", label: "LinkedIn", seed: 46 },
  { href: "/projects", label: "Portfolio", seed: 72 },
  { href: "https://buymeacoffee.com", label: "Donate", seed: 85 },
];

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
            <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">hob2log</p>
            <p className="mt-2 max-w-sm text-sm text-(--muted)">
              Private workspace for writing, prototyping, and preserving engineering notes with intention and clarity.
            </p>
            <p className="footer-copyright mt-6 text-xs text-(--muted)">
              © {year} hob2log. All rights reserved.
            </p>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em] text-sky-100/75">Navigation</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {navigationLinks.map((item) => (
                <Link key={item.href} href={item.href} className="footer-hover-item" style={getHoverSeedStyle(item.seed)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em] text-sky-100/75">Focus Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-(--muted)">
              {focusRules.map((item) => (
                <li key={item.label} className="footer-hover-item" style={getHoverSeedStyle(item.seed)}>
                  {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="footer-label text-xs uppercase tracking-[0.2em] text-sky-100/75">Social Network</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith("http") ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className="footer-hover-item" style={getHoverSeedStyle(item.seed)}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className="footer-hover-item" style={getHoverSeedStyle(item.seed)}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="footer-support-panel">
            <p className="footer-label text-xs uppercase tracking-[0.2em] text-sky-100/75">Bonus / Donate</p>
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
