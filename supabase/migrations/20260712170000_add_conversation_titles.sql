alter table public.conversations
  add column if not exists title text not null default 'New conversation';

alter table public.conversations
  add constraint conversations_title_length_check
  check (char_length(trim(title)) between 1 and 120);
