alter table "orders"
  add column if not exists "paymentMethod" varchar(32) not null default 'online_payment',
  add column if not exists "paymentStatus" varchar(32) not null default 'paid';

update "orders"
set
  "paymentMethod" = coalesce("paymentMethod", 'online_payment'),
  "paymentStatus" = coalesce("paymentStatus", 'paid');
