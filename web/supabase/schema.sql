create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

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

create table if not exists public.post_chunks (
  id bigserial primary key,
  post_slug text not null references public.posts (slug) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null default 0,
  embedding extensions.vector(384),
  created_at timestamptz not null default now(),
  unique (post_slug, chunk_index)
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null references public.posts (slug) on delete cascade,
  title text not null default 'New session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.posts enable row level security;
alter table public.post_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "public_can_read_projects" on public.projects;
create policy "public_can_read_projects" on public.projects
  for select using (true);

drop policy if exists "public_can_read_published_posts" on public.posts;
create policy "public_can_read_published_posts" on public.posts
  for select using (published = true);

drop policy if exists "public_can_read_post_chunks_for_published_posts" on public.post_chunks;
create policy "public_can_read_post_chunks_for_published_posts" on public.post_chunks
  for select using (
    exists (
      select 1
      from public.posts
      where public.posts.slug = public.post_chunks.post_slug
        and public.posts.published = true
    )
  );

drop policy if exists "public_no_access_chat_sessions" on public.chat_sessions;
create policy "public_no_access_chat_sessions" on public.chat_sessions
  for all using (false);

drop policy if exists "public_no_access_chat_messages" on public.chat_messages;
create policy "public_no_access_chat_messages" on public.chat_messages
  for all using (false);

create index if not exists idx_post_chunks_post_slug on public.post_chunks(post_slug);
create index if not exists idx_post_chunks_embedding_hnsw on public.post_chunks using hnsw (embedding vector_ip_ops);
create index if not exists idx_chat_sessions_post_slug_updated_at on public.chat_sessions(post_slug, updated_at desc);
create index if not exists idx_chat_sessions_expires_at on public.chat_sessions(expires_at);
create index if not exists idx_chat_messages_session_id_created_at on public.chat_messages(session_id, created_at);
