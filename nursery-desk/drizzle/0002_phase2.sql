alter table schools add column if not exists admission_prefix text;
alter table classes add column if not exists monthly_fee_paise integer not null default 650000;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  admission_no text not null,
  first_name text not null,
  last_name text,
  dob date,
  gender text not null check (gender in ('Girl', 'Boy', 'Other')),
  medical_notes text,
  class_id uuid references classes(id),
  roll_no integer,
  status text not null default 'applied' check (status in ('applied', 'documents_pending', 'enrolled', 'ready', 'withdrawn')),
  photo_url text,
  admitted_on date,
  discount_kind text not null default 'none' check (discount_kind in ('none', 'sibling', 'staff')),
  unique (school_id, admission_no)
);

create unique index if not exists students_class_roll
  on students (class_id, roll_no)
  where class_id is not null and roll_no is not null;

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  profile_id uuid references profiles(id),
  full_name text not null,
  phone text,
  email text,
  relationship text,
  address text,
  emergency_contact text
);

create table if not exists student_guardians (
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

create table if not exists student_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null check (kind in ('birth_certificate', 'photo', 'immunisation', 'parent_id', 'address_proof')),
  file_path text not null,
  file_name text not null,
  content_type text not null default 'application/octet-stream',
  uploaded_at timestamptz not null default now(),
  unique (student_id, kind)
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  child_name text not null,
  parent_name text not null,
  phone text not null,
  class_interest text,
  source text not null check (source in ('Walk-in', 'Phone', 'Website', 'Instagram', 'Referral')),
  status text not null default 'New' check (status in ('New', 'Follow-up', 'Visit booked', 'Converted', 'Lost')),
  next_follow_up_at timestamptz,
  lost_reason text,
  converted_student_id uuid references students(id)
);

create table if not exists enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  enquiry_id uuid not null references enquiries(id) on delete cascade,
  author_id uuid references profiles(id),
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists students_school_id_idx on students (school_id);
create index if not exists guardians_school_id_idx on guardians (school_id);
create index if not exists enquiries_school_id_idx on enquiries (school_id);
create index if not exists enquiry_notes_enquiry_id_idx on enquiry_notes (enquiry_id);
create index if not exists student_documents_student_id_idx on student_documents (student_id);
