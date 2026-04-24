import { projects as seedProjects } from "@/content/projects";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Project } from "@/types/content";

interface ProjectInput {
  slug: string;
  name: string;
  description: string;
  stack: string[];
  status: Project["status"];
}

interface ProjectRow {
  slug: string;
  name: string;
  description: string;
  stack: string[] | null;
  status: Project["status"];
}

const runtimeProjects: Project[] = [];

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    stack: Array.isArray(row.stack) ? row.stack : [],
    status: row.status,
  };
}

function listFallbackProjects() {
  const merged = [...runtimeProjects, ...seedProjects];
  const unique = new Map<string, Project>();

  for (const item of merged) {
    if (!unique.has(item.slug)) {
      unique.set(item.slug, item);
    }
  }

  return Array.from(unique.values());
}

function validateProjectStatus(status: string): status is Project["status"] {
  return status === "planned" || status === "in-progress" || status === "completed";
}

function normalizeInput(input: ProjectInput) {
  const slug = normalizeSlug(input.slug || input.name);

  if (!slug) {
    throw new Error("Slug is required");
  }

  if (!input.name.trim()) {
    throw new Error("Name is required");
  }

  if (!input.description.trim()) {
    throw new Error("Description is required");
  }

  if (!validateProjectStatus(input.status)) {
    throw new Error("Invalid status");
  }

  return {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    stack: input.stack.map((item) => item.trim()).filter(Boolean),
    status: input.status,
  };
}

export async function listProjects() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return listFallbackProjects();
  }

  const { data, error } = await supabase
    .from("projects")
    .select("slug,name,description,stack,status")
    .order("name", { ascending: true });

  if (error || !data) {
    return listFallbackProjects();
  }

  return data.map((row) => mapProjectRow(row as ProjectRow));
}

export async function createProject(input: ProjectInput) {
  const project = normalizeInput(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const duplicate = listFallbackProjects().some((item) => item.slug === project.slug);

    if (duplicate) {
      throw new Error("A project with this slug already exists");
    }

    runtimeProjects.unshift(project);
    return project;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select("slug,name,description,stack,status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create project");
  }

  return mapProjectRow(data as ProjectRow);
}

export async function updateProject(currentSlug: string, input: ProjectInput) {
  const project = normalizeInput(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const index = runtimeProjects.findIndex((item) => item.slug === currentSlug);

    if (index !== -1) {
      runtimeProjects[index] = project;
      return project;
    }

    const seedIndex = seedProjects.findIndex((item) => item.slug === currentSlug);

    if (seedIndex !== -1) {
      throw new Error("Seed projects are read-only in fallback mode");
    }

    throw new Error("Project not found");
  }

  const { data, error } = await supabase
    .from("projects")
    .update(project)
    .eq("slug", currentSlug)
    .select("slug,name,description,stack,status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update project");
  }

  return mapProjectRow(data as ProjectRow);
}

export async function deleteProject(slug: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const index = runtimeProjects.findIndex((item) => item.slug === slug);

    if (index === -1) {
      return false;
    }

    runtimeProjects.splice(index, 1);
    return true;
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("slug", slug)
    .select("slug")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }

    throw new Error(error.message);
  }

  return Boolean(data);
}
