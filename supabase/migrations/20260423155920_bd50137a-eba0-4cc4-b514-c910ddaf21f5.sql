-- Tabla para cobros únicos manuales (links de pago Paddle)
create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  amount_cents integer not null check (amount_cents >= 70),
  currency text not null default 'USD',
  customer_email text,
  customer_name text,
  status text not null default 'pending',
  paddle_transaction_id text,
  paddle_customer_id text,
  environment text not null default 'sandbox',
  paid_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payment_links_token on public.payment_links(token);
create index idx_payment_links_status on public.payment_links(status);
create index idx_payment_links_created_by on public.payment_links(created_by);
create index idx_payment_links_paddle_tx on public.payment_links(paddle_transaction_id);

alter table public.payment_links enable row level security;

create policy "Authenticated users can view payment links"
  on public.payment_links for select
  to authenticated
  using (true);

create policy "Authenticated users can create payment links"
  on public.payment_links for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Authenticated users can update payment links"
  on public.payment_links for update
  to authenticated
  using (true);

create policy "Admins can delete payment links"
  on public.payment_links for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Acceso público por token (para que el cliente pueda abrir el checkout)
create policy "Public can view payment link by token"
  on public.payment_links for select
  to anon
  using (true);

-- Service role manages all (webhook)
create policy "Service role manages payment links"
  on public.payment_links for all
  to service_role
  using (true)
  with check (true);

create trigger update_payment_links_updated_at
  before update on public.payment_links
  for each row execute function public.update_updated_at_column();