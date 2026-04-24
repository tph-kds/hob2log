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
- Admin password authentication and protected write APIs
- Admin CRUD for side projects and blog posts (with draft/publish + media attachments)

## Local setup

1. Copy `.env.example` to `.env.local`
1. Fill in Supabase, Cloudinary, and `ADMIN_PASSWORD` values
1. Run SQL in `supabase/schema.sql` to create `posts` and `projects` tables
1. Install dependencies and run:

```bash
npm run dev
```

Open http://localhost:3000.

## Admin access

- Login route: `/admin/login`
- Admin dashboard: `/admin`
- Blog manager: `/admin/blog`
- Projects manager: `/admin/projects`

Only authenticated admin sessions can call mutation APIs:

- `POST /api/posts`
- `PUT|DELETE /api/posts/[slug]`
- `POST|PUT|DELETE /api/projects`

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
