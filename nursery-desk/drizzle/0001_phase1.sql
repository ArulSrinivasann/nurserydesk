create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_paise integer not null,
  child_limit integer,
  features jsonb not null default '[]'::jsonb
);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  logo_url text,
  plan_id uuid not null references plans(id),
  status text not null default 'trial' check (status in ('active', 'trial', 'past_due')),
  trial_ends_at timestamptz,
  renews_on date,
  admission_fee_paise integer not null default 1000000
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  role text not null check (role in ('super_admin', 'school_admin', 'teacher', 'parent')),
  full_name text not null,
  phone text,
  email text not null unique,
  password_hash text not null,
  constraint super_admin_has_no_school check (
    (role = 'super_admin' and school_id is null) or
    (role <> 'super_admin' and school_id is not null)
  )
);

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false
);

create unique index if not exists academic_years_one_current
  on academic_years (school_id)
  where is_current;

create unique index if not exists academic_years_school_label
  on academic_years (school_id, label);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  academic_year_id uuid not null references academic_years(id),
  name text not null,
  age_range text,
  capacity integer not null check (capacity > 0),
  teacher_id uuid references profiles(id)
);

create unique index if not exists classes_school_year_name
  on classes (school_id, academic_year_id, name);

create index if not exists classes_school_id_idx on classes (school_id);
create index if not exists academic_years_school_id_idx on academic_years (school_id);
create index if not exists profiles_school_id_idx on profiles (school_id);
