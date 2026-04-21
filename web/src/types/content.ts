export interface Post {
  slug: string;
  title: string;
  summary: string;
  createdAt: string;
  tags: string[];
  coverImage?: string;
  content: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  stack: string[];
  status: "planned" | "in-progress" | "completed";
}