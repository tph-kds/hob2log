# hob2log

A modern personal web application built with Next.js, featuring a blog, projects showcase, and media-driven UI components.

## Overview

`hob2log` is organized as a web app workspace in `web/`. The project includes:
- Public pages (`/`, `/blog`, `/projects`, `/policy`)
- Dynamic content routes (blog post detail pages)
- Admin area and API routes
- Cloudinary-backed media support
- Supabase-backed data integration

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Cloudinary
- Three.js / React Three Fiber

## Project Structure

```text
hob2log/
  web/                 # Main Next.js application
  assets/              # Project assets
  .kilo/               # Project agent/command configuration
```

## Getting Started

1. Navigate to the app directory:

```bash
cd web
```

2. Install dependencies:

```bash
npm install
```

3. Create your local environment file:

```bash
cp .env.example .env.local
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser at:

```text
http://localhost:3000
```

## Environment Variables

Use `web/.env.example` as the source of truth. Configure values for:
- Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Admin authentication (`ADMIN_PASSWORD`)
- Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_MUSIC_PREFIX`)
- Optional card image URLs for UI customization

## Available Scripts

Run these from `web/`:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run lint` - Run ESLint
- `npm run clean:next` - Remove `.next` build cache

## Deployment

Deploy on Vercel with these recommended settings:
- Root Directory: `web`
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

Add all required environment variables in Vercel Project Settings before deploying.

## Author

- **Name:** Trần Phi Hùng
- **Email:** tranphihung8383@gmail.com

## License

This project is licensed under the terms described in `LICENSE`.
