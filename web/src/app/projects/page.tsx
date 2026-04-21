import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { projects } from "@/content/projects";

export default function ProjectsPage() {
  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-5xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Execution Board</p>
          <h1 className="mt-2 text-4xl font-semibold">Side Projects</h1>
          <p className="mt-2 max-w-2xl text-sm text-(--muted)">
            Track active and planned experiments with clear status and stack context.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <article key={project.slug} className="interactive-gradient-card rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-(--accent)">{project.status}</p>
                <h2 className="mt-2 text-2xl font-medium">{project.name}</h2>
                <p className="mt-2 text-sm text-(--muted)">{project.description}</p>
                <p className="mt-3 text-xs text-sky-100/80">{project.stack.join(" · ")}</p>
              </article>
            ))}
          </div>
        </LiquidSection>
      </main>

      <SiteFooter />
    </div>
  );
}