alter policy "same home chat read" on public.chat_messages
  using (
    home_id = (select public.my_home_id())
    and (
      recipient_id is null
      or sender_id = (select auth.uid())
      or recipient_id = (select auth.uid())
    )
  );

alter policy "same home chat insert" on public.chat_messages
  with check (
    sender_id = (select auth.uid())
    and home_id = (select public.my_home_id())
    and (
      recipient_id is null
      or exists (
        select 1 from public.profiles r
        where r.id = chat_messages.recipient_id
          and r.home_id = chat_messages.home_id
      )
    )
  );
