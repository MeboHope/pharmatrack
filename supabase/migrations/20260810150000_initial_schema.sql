-- PharmaTrack schema: pharmacy inventory, dispensing and user profiles.
-- All business tables are shared across the pharmacy: any authenticated user can
-- read and write them. Profiles are readable by all authenticated users but only
-- editable by their owner.

create extension if not exists "pgcrypto";

create type user_role as enum ('Admin', 'Pharmacist', 'Clinician');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text,
  role user_role not null default 'Clinician',
  created_at timestamptz not null default now()
);

create table drugs (
  id text primary key,
  code text not null unique,
  name text not null,
  generic_name text not null default '',
  category text not null default 'Other',
  formulation text not null default 'Tablets',
  batch_no text not null default '',
  manufacture_date date,
  expiry_date date not null,
  qty integer not null default 0 check (qty >= 0),
  unit text not null default 'Tablets',
  buying_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  markup_percent numeric(6, 2) not null default 0,
  status text not null default 'In Stock',
  notes text,
  created_at date not null default current_date
);

create table patients (
  id text primary key,
  name text not null,
  phone text not null default '',
  email text,
  age integer,
  gender text,
  address text,
  allergies text,
  total_visits integer not null default 0,
  created_at date not null default current_date
);

create table suppliers (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  lead_time_days integer not null default 0
);

create table transactions (
  id text primary key,
  date text not null,
  patient_type text not null,
  patient_name text not null,
  phone text,
  clinician_name text not null default '',
  prescription_date text,
  diagnosis text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_method text not null default 'Cash',
  cash_tendered numeric(12, 2),
  change_amount numeric(12, 2),
  mpesa_code text,
  status text not null default 'Completed',
  created_at timestamptz not null default now()
);

create table stock_adjustments (
  id text primary key,
  date text not null,
  drug_id text not null references drugs (id) on delete cascade,
  drug_name text not null,
  batch_no text not null default '',
  previous_qty integer not null default 0,
  adjusted_qty integer not null default 0,
  type text not null,
  reason text not null default '',
  adjusted_by text not null default '',
  created_at timestamptz not null default now()
);

-- Single shared row of pharmacy-wide settings, pinned to id = 1.
create table pharmacy_settings (
  id integer primary key default 1 check (id = 1),
  pharmacy_name text not null default '',
  tagline text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  currency text not null default 'Ksh',
  clinician_name text not null default '',
  expiry_alert_days integer not null default 90,
  reorder_alert_level integer not null default 10,
  logo_url text
);

create index drugs_status_idx on drugs (status);
create index drugs_expiry_date_idx on drugs (expiry_date);
create index stock_adjustments_drug_id_idx on stock_adjustments (drug_id);

-- Create a profile automatically whenever a user signs up.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'Clinician')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter table profiles enable row level security;
alter table drugs enable row level security;
alter table patients enable row level security;
alter table suppliers enable row level security;
alter table transactions enable row level security;
alter table stock_adjustments enable row level security;
alter table pharmacy_settings enable row level security;

create policy "Profiles are readable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users manage drugs"
  on drugs for all to authenticated using (true) with check (true);

create policy "Authenticated users manage patients"
  on patients for all to authenticated using (true) with check (true);

create policy "Authenticated users manage suppliers"
  on suppliers for all to authenticated using (true) with check (true);

create policy "Authenticated users manage transactions"
  on transactions for all to authenticated using (true) with check (true);

create policy "Authenticated users manage stock adjustments"
  on stock_adjustments for all to authenticated using (true) with check (true);

create policy "Authenticated users manage pharmacy settings"
  on pharmacy_settings for all to authenticated using (true) with check (true);
