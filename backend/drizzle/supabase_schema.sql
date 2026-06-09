do $$
begin
  create type "user_role" as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "order_status" as enum ('pending', 'preparing', 'confirmed', 'ready', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists "users" (
  "id" serial primary key,
  "openId" varchar(64) not null unique,
  "name" text,
  "email" varchar(320),
  "loginMethod" varchar(64),
  "role" "user_role" not null default 'user',
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "lastSignedIn" timestamp not null default now()
);

create table if not exists "menuItems" (
  "id" serial primary key,
  "name" varchar(255) not null,
  "description" text,
  "price" integer not null,
  "category" varchar(100) not null,
  "image" text,
  "isVegetarian" integer not null default 0,
  "isAvailable" integer not null default 1,
  "stockQuantity" integer not null default 100,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "offers" (
  "id" serial primary key,
  "title" text not null,
  "description" text,
  "image_url" text,
  "discount_text" text,
  "start_date" date,
  "end_date" date,
  "is_active" boolean default true,
  "created_at" timestamp default now(),
  "updated_at" timestamp default now()
);

create table if not exists "orders" (
  "id" serial primary key,
  "customerName" varchar(255) not null,
  "customerPhone" varchar(20) not null,
  "customerEmail" varchar(320),
  "totalPrice" integer not null,
  "paymentMethod" varchar(32) not null default 'online_payment',
  "paymentStatus" varchar(32) not null default 'paid',
  "status" "order_status" not null default 'pending',
  "pickupTime" timestamp not null,
  "pickupSlotStart" timestamp not null,
  "pickupSlotEnd" timestamp not null,
  "pickupDate" varchar(10) not null,
  "notes" text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "orderItems" (
  "id" serial primary key,
  "orderId" integer not null,
  "menuItemId" integer not null,
  "quantity" integer not null,
  "priceAtOrder" integer not null,
  "createdAt" timestamp not null default now()
);

create table if not exists "storeSettings" (
  "key" varchar(64) primary key,
  "value" text not null,
  "updatedAt" timestamp not null default now()
);

create table if not exists "dailyOrderCounts" (
  "pickupDate" varchar(10) primary key,
  "orderCount" integer not null default 0,
  "updatedAt" timestamp not null default now()
);

alter table "menuItems"
  add column if not exists "stockQuantity" integer not null default 100,
  add column if not exists "image" text;

alter table "offers"
  add column if not exists "image_url" text,
  add column if not exists "discount_text" text,
  add column if not exists "start_date" date,
  add column if not exists "end_date" date,
  add column if not exists "is_active" boolean default true,
  add column if not exists "created_at" timestamp default now(),
  add column if not exists "updated_at" timestamp default now();

create index if not exists "offers_active_dates_idx"
  on "offers" ("is_active", "start_date", "end_date");

alter table "orders"
  add column if not exists "pickupSlotStart" timestamp,
  add column if not exists "pickupSlotEnd" timestamp,
  add column if not exists "pickupDate" varchar(10),
  add column if not exists "paymentMethod" varchar(32) not null default 'online_payment',
  add column if not exists "paymentStatus" varchar(32) not null default 'paid';

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

insert into "dailyOrderCounts" ("pickupDate", "orderCount", "updatedAt")
select "pickupDate", count(*)::integer, now()
from "orders"
where "status" <> 'cancelled'
group by "pickupDate"
on conflict ("pickupDate") do update
set "orderCount" = excluded."orderCount",
    "updatedAt" = now();
