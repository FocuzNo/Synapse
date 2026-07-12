create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null default 'mock',
  provider_customer_id text null,
  provider_subscription_id text null,
  plan_key text not null default 'free',
  scheduled_plan_key text null,
  status text not null default 'active',
  billing_email text null,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_workspace_id_key unique (workspace_id),
  constraint subscriptions_provider_check check (provider in ('mock', 'stripe')),
  constraint subscriptions_plan_key_check check (plan_key in ('free', 'starter', 'pro')),
  constraint subscriptions_scheduled_plan_key_check check (
    scheduled_plan_key is null or scheduled_plan_key in ('free', 'starter', 'pro')
  ),
  constraint subscriptions_status_check check (
    status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')
  )
);

create unique index if not exists subscriptions_provider_customer_id_key
  on public.subscriptions(provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_id_key
  on public.subscriptions(provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists subscriptions_workspace_plan_idx
  on public.subscriptions(workspace_id, plan_key);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Members can read subscriptions" on public.subscriptions;
create policy "Members can read subscriptions"
on public.subscriptions for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners and admins can insert subscriptions" on public.subscriptions;
create policy "Owners and admins can insert subscriptions"
on public.subscriptions for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "Owners and admins can update subscriptions" on public.subscriptions;
create policy "Owners and admins can update subscriptions"
on public.subscriptions for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

revoke all on public.subscriptions from anon, authenticated;
grant select, insert, update on public.subscriptions to authenticated;
