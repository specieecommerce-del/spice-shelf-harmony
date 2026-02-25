-- Align payment_titles with final schema: add mode, set due_date as date, ensure default status
alter table if exists public.payment_titles
  add column if not exists mode text not null default 'manual';

alter table if exists public.payment_titles
  alter column due_date type date using due_date::date;

alter table if exists public.payment_titles
  alter column status set default 'issued';

-- Optional indexes for mode
create index if not exists payment_titles_mode_idx on public.payment_titles(mode);
