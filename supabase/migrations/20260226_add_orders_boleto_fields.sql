-- Add boleto/provider fields to orders without removing existing columns
alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists provider_payment_id text,
  add column if not exists boleto_url text,
  add column if not exists boleto_pdf_url text,
  add column if not exists boleto_line text,
  add column if not exists boleto_barcode text,
  add column if not exists boleto_due_date timestamptz,
  add column if not exists paid_at timestamptz;

-- Optional helpful indexes
create index if not exists orders_payment_provider_idx on public.orders(payment_provider);
create index if not exists orders_provider_payment_id_idx on public.orders(provider_payment_id);
