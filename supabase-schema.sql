-- Run this in Supabase → SQL Editor (a free project at https://supabase.com).
-- Creates the two tables the site needs. The service_role key used by the
-- server bypasses Row Level Security, so no extra policies are required.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  company text not null default '',
  country text not null default '',
  product text not null default '',
  budget text not null default ''
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  description text not null default '',
  price text not null default '',
  image text not null default ''
);

-- Enable RLS as good practice; the server uses the service_role key which
-- bypasses RLS, so anonymous web traffic cannot read/write these tables.
alter table messages enable row level security;
alter table products enable row level security;
