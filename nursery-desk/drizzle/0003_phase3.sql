create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id),
  date date not null,
  status text not null check (status in ('present', 'late', 'absent')),
  marked_by uuid references profiles(id),
  constraint attendance_student_date unique (student_id, date)
);

create table if not exists daily_updates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  class_id uuid not null references classes(id),
  author_id uuid references profiles(id),
  body text not null,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  title text not null,
  body text not null,
  audience text not null default 'all',
  created_at timestamptz not null default now()
);

create table if not exists assessment_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  academic_year_id uuid not null references academic_years(id),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false
);

create unique index if not exists assessment_terms_one_current
  on assessment_terms (school_id)
  where is_current;

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references assessment_terms(id) on delete cascade,
  area text not null,
  level smallint not null check (level between 1 and 4),
  assessed_by uuid references profiles(id),
  constraint assessments_student_term_area unique (student_id, term_id, area)
);

create table if not exists progress_remarks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references assessment_terms(id) on delete cascade,
  remark text not null,
  constraint progress_remarks_student_term unique (student_id, term_id)
);

create index if not exists attendance_school_date_idx on attendance (school_id, date);
create index if not exists attendance_class_date_idx on attendance (class_id, date);
create index if not exists daily_updates_class_id_idx on daily_updates (class_id);
create index if not exists assessments_student_term_idx on assessments (student_id, term_id);
