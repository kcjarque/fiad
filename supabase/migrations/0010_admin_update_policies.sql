-- Anon UPDATE policies for tables the admin console writes to.
--
-- 0005_enable_rls.sql granted SELECT but no UPDATE on several tables, which
-- silently breaks the admin Event Settings, Vendors, Challenges, and
-- Walkthrough editors. Symptom: PostgREST returns 0 rows from the .select()
-- after the blocked UPDATE, and the client throws "Cannot coerce the result
-- to a single JSON object".

create policy "anon_update_events" on events
  for update to anon using (true) with check (true);

create policy "anon_update_stores" on stores
  for update to anon using (true) with check (true);

create policy "anon_update_challenges" on challenges
  for update to anon using (true) with check (true);

create policy "anon_update_walkthrough_items" on walkthrough_items
  for update to anon using (true) with check (true);

-- INSERT policies for admin-created rows (vendor, challenge, walkthrough item)
create policy "anon_insert_stores" on stores
  for insert to anon with check (true);

create policy "anon_insert_challenges" on challenges
  for insert to anon with check (true);

create policy "anon_insert_walkthrough_items" on walkthrough_items
  for insert to anon with check (true);

-- DELETE policies so admin can remove rows from the editor.
create policy "anon_delete_stores" on stores
  for delete to anon using (true);

create policy "anon_delete_challenges" on challenges
  for delete to anon using (true);

create policy "anon_delete_walkthrough_items" on walkthrough_items
  for delete to anon using (true);
