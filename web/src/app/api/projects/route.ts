import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-session";
import { createProject, deleteProject, listProjects, updateProject } from "@/lib/projects-store";

export async function GET() {
  const items = await listProjects();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await createProject({
      slug: body.slug ?? "",
      name: body.name ?? "",
      description: body.description ?? "",
      stack: Array.isArray(body.stack) ? body.stack : [],
      status: body.status ?? "planned",
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentSlug = typeof body.currentSlug === "string" ? body.currentSlug : "";

    if (!currentSlug) {
      return NextResponse.json({ error: "currentSlug is required" }, { status: 400 });
    }

    const item = await updateProject(currentSlug, {
      slug: body.slug ?? "",
      name: body.name ?? "",
      description: body.description ?? "",
      stack: Array.isArray(body.stack) ? body.stack : [],
      status: body.status ?? "planned",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug : "";

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const removed = await deleteProject(slug);

    if (!removed) {
      return NextResponse.json({ error: "Project not found or not removable" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}