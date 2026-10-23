create table if not exists school_sequences (
  school_id uuid not null references schools(id),
  kind text not null,
  period text not null,
  next_value integer not null,
  primary key (school_id, kind, period)
);

create table if not exists fee_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  name text not null,
  amount_paise integer not null,
  applies_to_class_ids uuid[] not null default '{}',
  is_mandatory boolean not null default false,
  due_on date,
  recurring text not null default 'none'
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  number text not null,
  issued_on date not null,
  due_on date not null,
  status text not null default 'due',
  total_paise integer not null,
  kind text not null,
  period text,
  unique (school_id, number)
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  invoice_id uuid not null references invoices(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  fee_type_id uuid references fee_types(id),
  description text not null,
  amount_paise integer not null,
  discount_paise integer not null default 0,
  kind text not null,
  period text
);

create unique index if not exists invoice_items_one_monthly
  on invoice_items (student_id, period)
  where kind = 'monthly';

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id),
  receipt_no text not null,
  paid_on date not null,
  method text not null,
  reference text,
  total_paise integer not null,
  received_by uuid references profiles(id),
  unique (school_id, receipt_no)
);

create table if not exists payment_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  payment_id uuid not null references payments(id) on delete cascade,
  invoice_item_id uuid not null references invoice_items(id),
  amount_paise integer not null
);

create index if not exists invoices_school_status_idx on invoices (school_id, status);
create index if not exists invoice_items_invoice_id_idx on invoice_items (invoice_id);
create index if not exists payments_school_paid_on_idx on payments (school_id, paid_on);

create or replace function next_school_seq(p_school uuid, p_kind text, p_period text)
returns integer
language plpgsql
as $$
declare
  v integer;
begin
  insert into school_sequences (school_id, kind, period, next_value)
  values (p_school, p_kind, p_period, 1)
  on conflict (school_id, kind, period)
  do update set next_value = school_sequences.next_value + 1
  returning next_value into v;
  return v;
end;
$$;

create or replace function refresh_invoice_status(p_invoice uuid)
returns text
language plpgsql
as $$
declare
  v_total integer;
  v_paid integer;
  v_mandatory_unpaid integer;
  v_due date;
  v_status text;
begin
  select total_paise, due_on into v_total, v_due from invoices where id = p_invoice;
  if not found then
    raise exception 'Invoice not found';
  end if;

  select coalesce(sum(pi.amount_paise), 0) into v_paid
  from payment_items pi
  inner join invoice_items ii on ii.id = pi.invoice_item_id
  where ii.invoice_id = p_invoice;

  select coalesce(sum(greatest(ii.amount_paise - coalesce(paid.total, 0), 0)), 0)
    into v_mandatory_unpaid
  from invoice_items ii
  left join fee_types ft on ft.id = ii.fee_type_id
  left join (
    select invoice_item_id, sum(amount_paise) as total
    from payment_items
    group by invoice_item_id
  ) paid on paid.invoice_item_id = ii.id
  where ii.invoice_id = p_invoice
    and (
      ii.kind in ('admission', 'monthly')
      or coalesce(ft.is_mandatory, true)
    );

  if v_paid >= v_total then
    v_status := 'paid';
  elsif v_mandatory_unpaid > 0 and v_due < current_date then
    v_status := 'overdue';
  else
    v_status := 'due';
  end if;

  update invoices set status = v_status where id = p_invoice;
  return v_status;
end;
$$;
