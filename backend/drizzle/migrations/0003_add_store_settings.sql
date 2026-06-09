create table if not exists "storeSettings" (
  "key" varchar(64) primary key,
  "value" text not null,
  "updatedAt" timestamp not null default now()
);
