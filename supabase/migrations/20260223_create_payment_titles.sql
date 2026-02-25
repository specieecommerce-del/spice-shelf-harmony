-- Payment titles for boleto (and future methods)
create table if not exists public.payment_titles (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('boleto')),
  provider text not null,
  provider_title_id text,
  status text not null check (status in ('issued','pending','paid','canceled','expired')),
  amount_cents integer not null check (amount_cents >= 0),
  due_date timestamptz not null,
  linha_digitavel text,
  barcode text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Indexes
create index if not exists payment_titles_order_id_idx on public.payment_titles(order_id);
create index if not exists payment_titles_status_idx on public.payment_titles(status);
create index if not exists payment_titles_provider_idx on public.payment_titles(provider);

-- Trigger to update updated_at
create or replace function public.set_payment_titles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payment_titles_updated_at on public.payment_titles;
create trigger trg_payment_titles_updated_at
before update on public.payment_titles
for each row
execute function public.set_payment_titles_updated_at();
