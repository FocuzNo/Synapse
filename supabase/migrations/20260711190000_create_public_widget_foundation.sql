create table if not exists public.public_chat_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint public_chat_rate_limits_request_count_check check (request_count >= 0)
);

create table if not exists public.usage_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  ai_messages integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period_start),
  constraint usage_records_ai_messages_check check (ai_messages >= 0),
  constraint usage_records_input_tokens_check check (input_tokens >= 0),
  constraint usage_records_output_tokens_check check (output_tokens >= 0)
);

create index if not exists usage_records_period_start_idx
  on public.usage_records(period_start desc);

create unique index if not exists conversations_chatbot_source_public_session_key
  on public.conversations(chatbot_id, source, public_session_id);

drop trigger if exists set_public_chat_rate_limits_updated_at on public.public_chat_rate_limits;
create trigger set_public_chat_rate_limits_updated_at
before update on public.public_chat_rate_limits
for each row execute function public.set_updated_at();

drop trigger if exists set_usage_records_updated_at on public.usage_records;
create trigger set_usage_records_updated_at
before update on public.usage_records
for each row execute function public.set_updated_at();

create or replace function public.check_public_chat_rate_limit(
  rate_key text,
  window_seconds integer,
  request_limit integer
)
returns table (
  allowed boolean,
  current_count integer,
  limit_count integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  existing_row public.public_chat_rate_limits%rowtype;
begin
  if rate_key is null or btrim(rate_key) = '' then
    raise exception 'rate_key is required';
  end if;

  if window_seconds <= 0 then
    raise exception 'window_seconds must be positive';
  end if;

  if request_limit <= 0 then
    raise exception 'request_limit must be positive';
  end if;

  insert into public.public_chat_rate_limits as rl (
    key,
    window_start,
    request_count
  )
  values (
    rate_key,
    now_ts,
    1
  )
  on conflict (key) do update
  set
    window_start = case
      when rl.window_start + make_interval(secs => window_seconds) <= now_ts then now_ts
      else rl.window_start
    end,
    request_count = case
      when rl.window_start + make_interval(secs => window_seconds) <= now_ts then 1
      else rl.request_count + 1
    end,
    updated_at = now_ts
  returning * into existing_row;

  allowed := existing_row.request_count <= request_limit;
  current_count := existing_row.request_count;
  limit_count := request_limit;

  if allowed then
    retry_after_seconds := 0;
  else
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (existing_row.window_start + make_interval(secs => window_seconds) - now_ts)))
    )::integer;
  end if;

  return next;
end;
$$;

create or replace function public.consume_workspace_ai_usage(
  target_workspace_id uuid,
  message_limit integer,
  message_increment integer default 1,
  input_tokens_increment integer default 0,
  output_tokens_increment integer default 0
)
returns table (
  allowed boolean,
  current_count integer,
  limit_count integer,
  period_start date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_period_start date := date_trunc('month', now() at time zone 'utc')::date;
  usage_row public.usage_records%rowtype;
begin
  if target_workspace_id is null then
    raise exception 'target_workspace_id is required';
  end if;

  if message_limit <= 0 then
    raise exception 'message_limit must be positive';
  end if;

  if message_increment < 0 or input_tokens_increment < 0 or output_tokens_increment < 0 then
    raise exception 'usage increments must be non-negative';
  end if;

  if message_increment = 0 then
    insert into public.usage_records as ur (
      workspace_id,
      period_start,
      ai_messages,
      input_tokens,
      output_tokens
    )
    values (
      target_workspace_id,
      current_period_start,
      0,
      input_tokens_increment,
      output_tokens_increment
    )
    on conflict (workspace_id, period_start) do update
    set
      input_tokens = ur.input_tokens + excluded.input_tokens,
      output_tokens = ur.output_tokens + excluded.output_tokens,
      updated_at = now()
    returning * into usage_row;

    allowed := true;
    current_count := usage_row.ai_messages;
    limit_count := message_limit;
    period_start := current_period_start;
    return next;
    return;
  end if;

  insert into public.usage_records as ur (
    workspace_id,
    period_start,
    ai_messages,
    input_tokens,
    output_tokens
  )
  values (
    target_workspace_id,
    current_period_start,
    message_increment,
    input_tokens_increment,
    output_tokens_increment
  )
  on conflict (workspace_id, period_start) do update
  set
    ai_messages = ur.ai_messages + excluded.ai_messages,
    input_tokens = ur.input_tokens + excluded.input_tokens,
    output_tokens = ur.output_tokens + excluded.output_tokens,
    updated_at = now()
  where ur.ai_messages + excluded.ai_messages <= message_limit
  returning * into usage_row;

  if found then
    allowed := true;
    current_count := usage_row.ai_messages;
    limit_count := message_limit;
    period_start := current_period_start;
    return next;
    return;
  end if;

  select *
  into usage_row
  from public.usage_records
  where workspace_id = target_workspace_id
    and period_start = current_period_start;

  allowed := false;
  current_count := coalesce(usage_row.ai_messages, 0);
  limit_count := message_limit;
  period_start := current_period_start;
  return next;
end;
$$;

revoke all on function public.check_public_chat_rate_limit(text, integer, integer) from public;
grant execute on function public.check_public_chat_rate_limit(text, integer, integer) to authenticated, service_role;

revoke all on function public.consume_workspace_ai_usage(uuid, integer, integer, integer, integer) from public;
grant execute on function public.consume_workspace_ai_usage(uuid, integer, integer, integer, integer) to authenticated, service_role;

alter table public.public_chat_rate_limits enable row level security;
alter table public.usage_records enable row level security;

revoke all on public.public_chat_rate_limits from anon, authenticated;
revoke all on public.usage_records from anon, authenticated;
