export interface PostMedia {
  type: "image" | "video";
  url: string;
  alt?: string;
  caption?: string;
}

export interface Post {
  slug: string;
  title: string;
  summary: string;
  createdAt: string;
  tags: string[];
  coverImage?: string;
  media?: PostMedia[];
  published?: boolean;
  content: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  stack: string[];
  status: "planned" | "in-progress" | "completed";
}