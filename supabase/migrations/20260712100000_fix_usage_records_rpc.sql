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
    on conflict on constraint usage_records_pkey do update
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
  on conflict on constraint usage_records_pkey do update
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
  from public.usage_records ur
  where ur.workspace_id = target_workspace_id
    and ur.period_start = current_period_start;

  allowed := false;
  current_count := coalesce(usage_row.ai_messages, 0);
  limit_count := message_limit;
  period_start := current_period_start;
  return next;
end;
$$;

revoke all on function public.consume_workspace_ai_usage(uuid, integer, integer, integer, integer) from public;
grant execute on function public.consume_workspace_ai_usage(uuid, integer, integer, integer, integer) to authenticated, service_role;
