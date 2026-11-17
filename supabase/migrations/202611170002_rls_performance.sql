-- Cover foreign keys used by owner and participant lookups.
create index if not exists profile_phones_user_id_idx on public.profile_phones(user_id);
create index if not exists consent_records_user_id_idx on public.consent_records(user_id);
create index if not exists vehicles_owner_id_idx on public.vehicles(owner_id);
create index if not exists chat_messages_sender_id_idx on public.chat_messages(sender_id);
create index if not exists chat_messages_recipient_id_idx on public.chat_messages(recipient_id);

-- Evaluate auth.uid() once per statement instead of once per candidate row.
alter policy "profile phone owner access" on public.profile_phones
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "private profile owner only" on public.profile_private
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "same home read" on public.homes
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.home_id = homes.id
  ));

alter policy "own profile update" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "own consent read" on public.consent_records
  using (user_id = (select auth.uid()));

alter policy "own vehicles insert" on public.vehicles
  with check (owner_id = (select auth.uid()) and home_id = (select public.my_home_id()));

alter policy "own vehicles update" on public.vehicles
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and home_id = (select public.my_home_id()));

alter policy "own vehicles delete" on public.vehicles
  using (owner_id = (select auth.uid()));

alter policy "own chat delete" on public.chat_messages
  using (sender_id = (select auth.uid()));
