-- EcoBack "Hitze-Radar" subscribers — Supabase project uoijvtfrwlgixuogkyrz.
-- Applied via MCP when the write channel cooperates; kept here version-controlled
-- so the schema is reproducible and one-paste in the Supabase SQL editor.
--
-- GDPR-minimal: no raw IP stored; explicit consent (boolean + the exact opt-in
-- text shown) is logged. RLS lets the public anon key INSERT only — it can never
-- read the list back, so the address book cannot be scraped with the site key.
-- Reading is reserved for the service role (the alert-sending job).

create table if not exists public.ecoback_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'de' check (locale in ('de','en')),
  source text,
  topics text[] not null default '{}',
  region text,
  consent boolean not null,
  consent_text text,
  confirmed boolean not null default false,
  confirm_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint ecoback_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create or replace function public.ecoback_norm_email() returns trigger
  language plpgsql as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end $$;

drop trigger if exists trg_ecoback_norm_email on public.ecoback_subscribers;
create trigger trg_ecoback_norm_email before insert on public.ecoback_subscribers
  for each row execute function public.ecoback_norm_email();

create unique index if not exists ecoback_subscribers_email_key
  on public.ecoback_subscribers (email);

alter table public.ecoback_subscribers enable row level security;

drop policy if exists ecoback_anon_insert on public.ecoback_subscribers;
create policy ecoback_anon_insert on public.ecoback_subscribers
  for insert to anon
  with check (consent = true);

grant insert on public.ecoback_subscribers to anon;
