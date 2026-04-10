-- Admin RLS: Allow anon role (admin panel, no auth token) to read all data
-- Parents use 'authenticated' role (Supabase JWT) → still only see their own data
-- The admin panel uses the anon key without a user JWT → 'anon' role

-- Orders: anon can read all
create policy "Anon read all orders" on orders
  for select to anon using (true);

-- Order items: anon can read all
create policy "Anon read all order_items" on order_items
  for select to anon using (true);

-- Students: anon can read all (needed for kitchen/sticker name display)
create policy "Anon read all students" on students
  for select to anon using (true);
