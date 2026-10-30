create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  note text,
  status text not null default 'new' check (status in ('new', 'converted', 'dismissed')),
  converted_school_id uuid references schools(id),
  created_at timestamptz not null default now()
);

create index if not exists demo_requests_status_created_idx
  on demo_requests (status, created_at desc);
