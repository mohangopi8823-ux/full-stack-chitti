alter table "menuItems"
  add column if not exists "stockQuantity" integer not null default 100;

alter table "orders"
  add column if not exists "pickupSlotStart" timestamp,
  add column if not exists "pickupSlotEnd" timestamp,
  add column if not exists "pickupDate" varchar(10);

update "orders"
set
  "pickupSlotStart" = date_trunc('hour', "pickupTime")
    + floor(extract(minute from "pickupTime") / 30) * interval '30 minutes',
  "pickupSlotEnd" = date_trunc('hour', "pickupTime")
    + (floor(extract(minute from "pickupTime") / 30) + 1) * interval '30 minutes',
  "pickupDate" = to_char("pickupTime", 'YYYY-MM-DD')
where "pickupSlotStart" is null
  or "pickupSlotEnd" is null
  or "pickupDate" is null;

alter table "orders"
  alter column "pickupSlotStart" set not null,
  alter column "pickupSlotEnd" set not null,
  alter column "pickupDate" set not null;

create index if not exists "orders_pickup_slot_status_idx"
  on "orders" ("pickupSlotStart", "status");

create index if not exists "orders_pickup_date_status_idx"
  on "orders" ("pickupDate", "status");

create table if not exists "dailyOrderCounts" (
  "pickupDate" varchar(10) primary key,
  "orderCount" integer not null default 0,
  "updatedAt" timestamp not null default now()
);

insert into "dailyOrderCounts" ("pickupDate", "orderCount", "updatedAt")
select "pickupDate", count(*)::integer, now()
from "orders"
where "status" <> 'cancelled'
group by "pickupDate"
on conflict ("pickupDate") do update
set "orderCount" = excluded."orderCount",
    "updatedAt" = now();
