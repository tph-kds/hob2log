import { Post } from "@/types/content";

export const posts: Post[] = [
  {
    slug: "building-hob2log-foundation",
    title: "Building hob2log Foundation",
    summary: "How the project architecture moved from blueprint to runnable product shell.",
    createdAt: "2026-04-19",
    tags: ["architecture", "nextjs", "supabase"],
    content: `# Starting the Foundation

Today I turned the planning document into a running web app scaffold.

## Why this stack

- Next.js App Router for fast iteration and server routes
- Supabase for private-owner auth and structured content
- Cloudinary for image-heavy hobby logs

## First useful utility

\`\`\`ts
export function isOwnerSession(email: string) {
  return email.endsWith("@your-domain.com")
}
\`\`\`

Next milestone is wiring CRUD and markdown publishing from database.
`,
  },
  {
    slug: "transparent-ui-notes",
    title: "Transparent Workspace UI Notes",
    summary: "Design decisions for glass layers, gradients, and reading comfort.",
    createdAt: "2026-04-18",
    tags: ["ui", "motion", "design"],
    content: `# Transparent UI Direction

The interface should feel like a digital desk:

- layered translucent panels
- subtle glow fields
- readable type contrast

## Motion policy

Use smooth, intentional transitions only where it supports information hierarchy.
`,
  },
  {
    slug: "card-motion-prototype",
    title: "3D Card Motion Prototype",
    summary: "Prototype for cursor and scroll-reactive card effects with balanced performance.",
    createdAt: "2026-04-17",
    tags: ["3d", "prototype", "cards"],
    content: `# Card Prototype Notes

The first implementation uses CSS transforms with pointer tracking.

## Planned upgrade path

1. CSS 3D now (lightweight)
1. React Three Fiber in phase 2 for richer depth and highlights
1. Adaptive quality fallback for mobile
`,
  },
];