create table if not exists public.projects (
  slug text primary key,
  name text not null,
  description text not null,
  stack text[] not null default '{}',
  status text not null check (status in ('planned', 'in-progress', 'completed'))
);

create table if not exists public.posts (
  slug text primary key,
  title text not null,
  summary text not null,
  content text not null,
  tags text[] not null default '{}',
  cover_image text,
  media jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at date not null default current_date
);

alter table public.projects enable row level security;
alter table public.posts enable row level security;

drop policy if exists "public_can_read_projects" on public.projects;
create policy "public_can_read_projects" on public.projects
  for select using (true);

drop policy if exists "public_can_read_published_posts" on public.posts;
create policy "public_can_read_published_posts" on public.posts
  for select using (published = true);
