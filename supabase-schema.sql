create table public.lessons (
  id text primary key,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.flashcards (
  id text primary key,
  lesson_id text not null references public.lessons(id) on delete cascade,
  kanji text not null,
  reading text not null default '',
  meaning text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;
alter table public.flashcards enable row level security;

create policy "Anyone can read lessons" on public.lessons for select using (true);
create policy "Admins can manage lessons" on public.lessons for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Anyone can read flashcards" on public.flashcards for select using (true);
create policy "Admins can manage flashcards" on public.flashcards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
