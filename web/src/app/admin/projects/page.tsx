import { redirect } from "next/navigation";
import { AdminProjectsManager } from "@/components/admin/admin-projects-manager";
import { isAdminSessionAuthorized } from "@/lib/admin-session";

export default async function AdminProjectsPage() {
  if (!(await isAdminSessionAuthorized())) {
    redirect("/admin/login?next=/admin/projects");
  }

  return <AdminProjectsManager />;
}
