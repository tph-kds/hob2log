# hob2log web

Private-owner blog web app built with Next.js App Router.

## Current implementation

- Transparent workspace visual style with gradient atmosphere
- Blog listing and dynamic post pages
- Markdown rendering with code fence support and sanitization
- Projects showcase page
- API routes for health and post previews
- Integration utilities for Supabase and Cloudinary
- Interactive transparent card component with pointer and scroll reactivity

## Local setup

1. Copy `.env.example` to `.env.local`
1. Fill in Supabase and Cloudinary values
1. Install dependencies and run:

```bash
npm run dev
```

Open http://localhost:3000.

## Key folders

- `src/app` routes and API handlers
- `src/components` UI building blocks
- `src/content` seeded local content
- `src/lib` env, Supabase, and Cloudinary helpers
- `src/types` domain models

## Next implementation targets

1. Replace seeded content with Supabase-backed fetch and owner-only CRUD
1. Add Cloudinary upload endpoint and media metadata persistence
1. Upgrade 3D card module with React Three Fiber progressive enhancement
