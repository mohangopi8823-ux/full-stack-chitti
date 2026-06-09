alter table "menuItems"
  add column if not exists "image" text;

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
