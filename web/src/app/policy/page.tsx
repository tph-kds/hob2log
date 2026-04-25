import type { Metadata } from "next";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Policy Confirmation | hob2log",
  description:
    "Privacy, license, and security policy declaration for private and non-commercial project use.",
};

const resourceRules = [
  "Images, videos, music, and design assets are used only for private learning, prototyping, and documentation.",
  "Any third-party asset remains owned by its original creator and platform.",
  "Copyright notices, creator credits, and license terms are respected and preserved whenever available.",
  "No asset from this workspace is sold, relicensed, redistributed as a commercial bundle, or used in paid advertising.",
];

const privacyRules = [
  "This workspace is not designed to collect sensitive personal data for commercial profiling.",
  "Any visitor-facing information is limited to basic technical operation and content presentation.",
  "No intentional resale, exchange, or monetized sharing of private user information is performed.",
  "Content remains focused on engineering notes, experiments, and personal project records.",
];

const securityRules = [
  "Credentials and private configuration values are handled through environment variables and operational safeguards.",
  "Asset and content sources are reviewed to reduce copyright and misuse risks before publication.",
  "Project updates prioritize integrity, traceability, and controlled access for a private environment.",
  "When legal uncertainty appears, the safer path is to remove or replace questionable resources.",
];

export default function PolicyPage() {
  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-5xl px-4 pb-10 pt-[4.5rem] sm:px-6 sm:pb-12 sm:pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Policy Confirmation</p>
          <h1 className="mt-2 text-4xl font-semibold">Privacy, License, and Security Declaration</h1>
          <p className="mt-3 max-w-3xl text-sm text-(--muted)">
            This project is operated as a private workspace for research, education, and personal development. It is not a
            commercial product and is not intended to compete with, imitate, or create legal conflict with any commercial
            service, brand, or proprietary platform.
          </p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-sky-100/90">
            Confirmation statement: all referenced resources and generated content are maintained for private, non-commercial
            objectives only.
          </div>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">License and Resource Use</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-(--muted)">
                {resourceRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">Privacy Position</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-(--muted)">
                {privacyRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">Security Commitments</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-(--muted)">
                {securityRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-white/15 bg-slate-950/20 p-5">
            <h2 className="text-xl font-semibold">Conflict-Avoidance Notice</h2>
            <p className="mt-3 text-sm text-(--muted)">
              This private project does not claim partnership, sponsorship, endorsement, ownership, or official affiliation with
              external commercial products or intellectual property holders. If a rights owner requests correction or removal,
              the resource will be updated or deleted as a compliance-first action.
            </p>
          </section>
        </LiquidSection>
      </main>

      <SiteFooter />
    </div>
  );
}
