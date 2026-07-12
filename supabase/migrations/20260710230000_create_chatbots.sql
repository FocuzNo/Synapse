create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  public_id uuid not null default gen_random_uuid(),
  name text not null,
  description text null,
  welcome_message text not null default 'Hi! How can I help you today?',
  system_prompt text not null,
  status text not null default 'draft',
  primary_color text not null default '#6D5DFB',
  theme text not null default 'light',
  position text not null default 'bottom-right',
  branding_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chatbots_status_check check (status in ('draft', 'active', 'disabled')),
  constraint chatbots_theme_check check (theme in ('light', 'dark')),
  constraint chatbots_position_check check (position in ('bottom-right', 'bottom-left')),
  constraint chatbots_primary_color_check check (primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index if not exists chatbots_public_id_key on public.chatbots(public_id);
create index if not exists chatbots_workspace_id_idx on public.chatbots(workspace_id);
create index if not exists chatbots_workspace_created_at_idx on public.chatbots(workspace_id, created_at desc);

drop trigger if exists set_chatbots_updated_at on public.chatbots;
create trigger set_chatbots_updated_at
before update on public.chatbots
for each row execute function public.set_updated_at();

alter table public.chatbots enable row level security;

drop policy if exists "Members can read chatbots" on public.chatbots;
create policy "Members can read chatbots"
on public.chatbots for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners and admins can create chatbots" on public.chatbots;
create policy "Owners and admins can create chatbots"
on public.chatbots for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "Owners and admins can update chatbots" on public.chatbots;
create policy "Owners and admins can update chatbots"
on public.chatbots for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "Owners and admins can delete chatbots" on public.chatbots;
create policy "Owners and admins can delete chatbots"
on public.chatbots for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

revoke all on public.chatbots from anon, authenticated;
grant select, insert, update, delete on public.chatbots to authenticated;
