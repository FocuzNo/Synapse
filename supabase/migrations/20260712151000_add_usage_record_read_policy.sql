drop policy if exists "Members can read workspace usage" on public.usage_records;
create policy "Members can read workspace usage"
on public.usage_records for select
to authenticated
using (public.is_workspace_member(workspace_id));

grant select on public.usage_records to authenticated;
