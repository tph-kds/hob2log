"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
    >
      Logout
    </button>
  );
}
