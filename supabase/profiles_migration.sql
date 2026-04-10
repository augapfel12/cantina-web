-- User profiles table: links auth user to their school
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id),
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
