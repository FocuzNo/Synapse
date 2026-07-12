alter table public.conversations
  drop constraint if exists conversations_title_length_check;

alter table public.conversations
  add constraint conversations_title_length_check
  check (char_length(trim(title)) between 1 and 80);
