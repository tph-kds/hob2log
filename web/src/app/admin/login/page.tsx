"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";

function AdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") || "/admin", [searchParams]);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Login failed");
      setIsSubmitting(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-4xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Admin Authorization</p>
          <h1 className="mt-2 text-4xl font-semibold">Enter Admin Password</h1>
          <p className="mt-2 max-w-2xl text-sm text-(--muted)">
            This area is restricted. You must authenticate before accessing admin tools.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid max-w-md gap-3">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
              placeholder="Admin password"
              type="password"
              autoComplete="current-password"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="dynamic-theme-button w-fit rounded-full px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {isSubmitting ? "Authorizing..." : "Access Admin"}
            </button>
          </form>

          {status ? <p className="mt-4 text-sm text-red-200/90">{status}</p> : null}
        </LiquidSection>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPageContent />
    </Suspense>
  );
}
