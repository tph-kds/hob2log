import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { isAdminSessionAuthorized } from "@/lib/admin-session";

export default async function AdminPage() {
  if (!(await isAdminSessionAuthorized())) {
    redirect("/admin/login?next=/admin");
  }

  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-5xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Admin Workspace</p>
          <h1 className="mt-2 text-4xl font-semibold">Content Operations</h1>
          <p className="mt-2 max-w-2xl text-sm text-(--muted)">
            Separate admin area for managing publication content without affecting public browsing layout.
          </p>
          <div className="mt-4">
            <AdminLogoutButton />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link
              href="/admin/blog"
              className="interactive-gradient-card rounded-2xl border border-white/15 bg-white/5 p-5"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-(--accent)">Blog Management</p>
              <h2 className="mt-2 text-2xl font-medium">Create and Delete Posts</h2>
              <p className="mt-2 text-sm text-(--muted)">Use this panel to publish fast updates and remove runtime posts.</p>
            </Link>

            <Link
              href="/admin/projects"
              className="interactive-gradient-card rounded-2xl border border-white/15 bg-white/5 p-5"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-(--accent)">Projects Management</p>
              <h2 className="mt-2 text-2xl font-medium">Create, Update, and Delete Projects</h2>
              <p className="mt-2 text-sm text-(--muted)">Maintain side-project data with secure write access only for admin.</p>
            </Link>
          </div>
        </LiquidSection>
      </main>
      <SiteFooter />
    </div>
  );
}
