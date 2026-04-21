import { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "hob2log",
    name: "hob2log",
    description: "Private blog platform blending content, code snippets, and collectible-style media cards.",
    stack: ["Next.js", "Supabase", "Cloudinary", "Tailwind"],
    status: "in-progress",
  },
  {
    slug: "card-depth-lab",
    name: "Card Depth Lab",
    description: "Experiment space for transparent diamond card effects with pointer and scroll interaction.",
    stack: ["React", "CSS 3D", "Three.js"],
    status: "planned",
  },
  {
    slug: "focus-ambient-player",
    name: "Focus Ambient Player",
    description: "Ambient mode toggle with optional soundtrack and distraction-reduced reading view.",
    stack: ["Web Audio", "React", "LocalStorage"],
    status: "planned",
  },
];