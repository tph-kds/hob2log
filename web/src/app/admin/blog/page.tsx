import { redirect } from "next/navigation";
import { AdminBlogManager } from "@/components/admin/admin-blog-manager";
import { isAdminSessionAuthorized } from "@/lib/admin-session";

export default async function AdminBlogPage() {
  if (!(await isAdminSessionAuthorized())) {
    redirect("/admin/login?next=/admin/blog");
  }

  return <AdminBlogManager />;
}
