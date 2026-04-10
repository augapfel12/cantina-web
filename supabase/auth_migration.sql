-- Add user_id to students table to link to Supabase Auth
alter table students add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Add phone as mandatory field (already exists as parent_phone, just note it's now required in UI)
-- Create index for fast lookup
create index if not exists students_user_id_idx on students(user_id);

-- RLS: users can only see their own students
drop policy if exists "Public read students" on students;
create policy "Users read own students" on students for select using (auth.uid() = user_id);
create policy "Users insert own students" on students for insert with check (auth.uid() = user_id);
create policy "Users update own students" on students for update using (auth.uid() = user_id);

-- RLS: users can only see their own orders
drop policy if exists "Public read orders" on orders;
create policy "Users read own orders" on orders for select using (
  student_id in (select id from students where user_id = auth.uid())
);
create policy "Users insert own orders" on orders for insert with check (
  student_id in (select id from students where user_id = auth.uid())
);

-- RLS for order_items
drop policy if exists "Public read order_items" on order_items;
create policy "Users read own order_items" on order_items for select using (
  order_id in (
    select o.id from orders o
    join students s on o.student_id = s.id
    where s.user_id = auth.uid()
  )
);
create policy "Users insert own order_items" on order_items for insert with check (
  order_id in (
    select o.id from orders o
    join students s on o.student_id = s.id
    where s.user_id = auth.uid()
  )
);
