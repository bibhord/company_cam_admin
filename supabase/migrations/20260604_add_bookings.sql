-- Run in Supabase SQL Editor (idempotent)
create type if not exists booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled');

create table if not exists business_hours (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun
  open_time   time not null default '09:00',
  close_time  time not null default '17:00',
  is_closed   boolean not null default false,
  unique (org_id, day_of_week)
);

create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  service_id     uuid references services(id) on delete set null,
  service_name   text not null,
  duration_min   integer not null default 60,
  customer_name  text not null,
  customer_email text not null,
  customer_phone text,
  notes          text,
  booking_date   date not null,
  booking_time   time not null,
  status         booking_status not null default 'pending',
  admin_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table business_hours enable row level security;
alter table bookings enable row level security;

-- business_hours policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename='business_hours' and policyname='org_members_read_bh') then
    create policy org_members_read_bh on business_hours for select using (
      org_id in (select org_id from profiles where user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='business_hours' and policyname='public_read_bh') then
    create policy public_read_bh on business_hours for select using (
      org_id in (select id from organizations where portfolio_published = true)
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='business_hours' and policyname='org_admins_write_bh') then
    create policy org_admins_write_bh on business_hours for all using (
      org_id in (select org_id from profiles where user_id = auth.uid() and role in ('admin','manager'))
    ) with check (
      org_id in (select org_id from profiles where user_id = auth.uid() and role in ('admin','manager'))
    );
  end if;
  -- bookings
  if not exists (select 1 from pg_policies where tablename='bookings' and policyname='org_members_read_bookings') then
    create policy org_members_read_bookings on bookings for select using (
      org_id in (select org_id from profiles where user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='bookings' and policyname='org_admins_update_bookings') then
    create policy org_admins_update_bookings on bookings for update using (
      org_id in (select org_id from profiles where user_id = auth.uid() and role in ('admin','manager'))
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='bookings' and policyname='public_insert_bookings') then
    create policy public_insert_bookings on bookings for insert with check (
      org_id in (select id from organizations where portfolio_published = true)
    );
  end if;
end $$;
