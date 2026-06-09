alter table "menuItems"
add column if not exists "isVegetarian" integer not null default 0;

alter table "menuItems"
add column if not exists "isAvailable" integer not null default 1;

alter table "menuItems"
add column if not exists "createdAt" timestamp not null default now();

alter table "menuItems"
add column if not exists "updatedAt" timestamp not null default now();

update "menuItems"
set "isAvailable" = 0,
    "updatedAt" = now();

with new_menu("name", "description", "price", "category", "isVegetarian") as (
  values
    ('Chicken Pakodi - 200gms', 'Pakodi serving: 200gms.', 19900, 'pakodi', 0),
    ('Chicken Pakodi - 400gms', 'Pakodi serving: 400gms.', 38000, 'pakodi', 0),
    ('Jeedipappu Chicken Pakodi - 200gms', 'Cashew chicken pakodi serving: 200gms.', 22000, 'pakodi', 0),
    ('Jeedipappu Chicken Pakodi - 400gms', 'Cashew chicken pakodi serving: 400gms.', 40000, 'pakodi', 0),
    ('Nethalu Pakodi - 200gms', 'Nethalu pakodi serving: 200gms.', 22000, 'pakodi', 0),
    ('Nethalu Pakodi - 400gms', 'Nethalu pakodi serving: 400gms.', 40000, 'pakodi', 0),
    ('Chicken Leg Pakodi - 1 Piece', 'Chicken leg pakodi serving: 1 piece.', 9900, 'pakodi', 0),
    ('Mixed Biryani - Single Portion', 'Single portion mixed biryani.', 29900, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Pulao - Single', 'Single chicken fry piece pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Pepper Pulao - Single', 'Single chicken pepper pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Joint Pulao - Single', 'Single chicken joint pulao.', 27000, 'non-veg-pulaos', 0),
    ('Chicken Leg Pulao - Single', 'Single chicken leg pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Wings Pulao - Single', 'Single chicken wings pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Lollipop Pulao - Single', 'Single chicken lollipop pulao.', 22000, 'non-veg-pulaos', 0),
    ('Prawns Potlam Pulao - Single', 'Single prawns potlam pulao.', 29900, 'non-veg-pulaos', 0),
    ('Mutton Curry Pulao - Single', 'Single mutton curry pulao.', 29900, 'non-veg-pulaos', 0),
    ('Mutton Ghee Roast Pulao - Single', 'Single mutton ghee roast pulao.', 31900, 'non-veg-pulaos', 0),
    ('Velluli Kaaram Egg Pulao - Single', 'Single velluli kaaram egg pulao.', 19900, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Full', 'Full chicken fry piece pulao.', 38000, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Large', 'Large chicken fry piece pulao.', 49900, 'non-veg-pulaos', 0),
    ('Chicken Pepper Full', 'Full chicken pepper pulao.', 38000, 'non-veg-pulaos', 0),
    ('Chicken Pepper Large', 'Large chicken pepper pulao.', 49900, 'non-veg-pulaos', 0),
    ('Gutti Vankaya Pulao - Single', 'Single gutti vankaya pulao.', 19900, 'veg-pulaos', 1),
    ('Jeedipappu Pulao - Single', 'Single jeedipappu pulao.', 24900, 'veg-pulaos', 1),
    ('Chicken Joint Piece', 'Chicken joint piece curry add-on.', 18000, 'chitti-naidu-curries', 0),
    ('Chicken Fry Piece - Single Portion', 'Single portion chicken fry piece curry.', 14000, 'chitti-naidu-curries', 0),
    ('Chicken Curry - Single Portion', 'Single portion chicken curry.', 14000, 'chitti-naidu-curries', 0),
    ('Apricot Delight - 200gms', 'Dessert serving: 200gms.', 12000, 'chitti-naidu-desserts', 1),
    ('Bellam Junnu Homemade - 250gms', 'Homemade dessert serving: 250gms.', 14000, 'chitti-naidu-desserts', 1),
    ('Badam Paalu - 200ml', 'Badam paalu serving: 200ml.', 4000, 'chitti-naidu-desserts', 1),
    ('Badam Paalu - 500ml', 'Badam paalu serving: 500ml.', 9000, 'chitti-naidu-desserts', 1),
    ('Only Pulao Rice - Single Portion', 'Single portion pulao rice.', 10000, 'extra-add-ons', 1),
    ('Extra Egg', 'Extra egg add-on.', 1500, 'extra-add-ons', 0),
    ('Water Bottle', 'Water bottle.', 1000, 'extra-add-ons', 1)
)
update "menuItems" existing
set "description" = new_menu."description",
    "price" = new_menu."price",
    "category" = new_menu."category",
    "isVegetarian" = new_menu."isVegetarian",
    "isAvailable" = 1,
    "updatedAt" = now()
from new_menu
where existing."name" = new_menu."name";

with new_menu("name", "description", "price", "category", "isVegetarian") as (
  values
    ('Chicken Pakodi - 200gms', 'Pakodi serving: 200gms.', 19900, 'pakodi', 0),
    ('Chicken Pakodi - 400gms', 'Pakodi serving: 400gms.', 38000, 'pakodi', 0),
    ('Jeedipappu Chicken Pakodi - 200gms', 'Cashew chicken pakodi serving: 200gms.', 22000, 'pakodi', 0),
    ('Jeedipappu Chicken Pakodi - 400gms', 'Cashew chicken pakodi serving: 400gms.', 40000, 'pakodi', 0),
    ('Nethalu Pakodi - 200gms', 'Nethalu pakodi serving: 200gms.', 22000, 'pakodi', 0),
    ('Nethalu Pakodi - 400gms', 'Nethalu pakodi serving: 400gms.', 40000, 'pakodi', 0),
    ('Chicken Leg Pakodi - 1 Piece', 'Chicken leg pakodi serving: 1 piece.', 9900, 'pakodi', 0),
    ('Mixed Biryani - Single Portion', 'Single portion mixed biryani.', 29900, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Pulao - Single', 'Single chicken fry piece pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Pepper Pulao - Single', 'Single chicken pepper pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Joint Pulao - Single', 'Single chicken joint pulao.', 27000, 'non-veg-pulaos', 0),
    ('Chicken Leg Pulao - Single', 'Single chicken leg pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Wings Pulao - Single', 'Single chicken wings pulao.', 22000, 'non-veg-pulaos', 0),
    ('Chicken Lollipop Pulao - Single', 'Single chicken lollipop pulao.', 22000, 'non-veg-pulaos', 0),
    ('Prawns Potlam Pulao - Single', 'Single prawns potlam pulao.', 29900, 'non-veg-pulaos', 0),
    ('Mutton Curry Pulao - Single', 'Single mutton curry pulao.', 29900, 'non-veg-pulaos', 0),
    ('Mutton Ghee Roast Pulao - Single', 'Single mutton ghee roast pulao.', 31900, 'non-veg-pulaos', 0),
    ('Velluli Kaaram Egg Pulao - Single', 'Single velluli kaaram egg pulao.', 19900, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Full', 'Full chicken fry piece pulao.', 38000, 'non-veg-pulaos', 0),
    ('Chicken Fry Piece Large', 'Large chicken fry piece pulao.', 49900, 'non-veg-pulaos', 0),
    ('Chicken Pepper Full', 'Full chicken pepper pulao.', 38000, 'non-veg-pulaos', 0),
    ('Chicken Pepper Large', 'Large chicken pepper pulao.', 49900, 'non-veg-pulaos', 0),
    ('Gutti Vankaya Pulao - Single', 'Single gutti vankaya pulao.', 19900, 'veg-pulaos', 1),
    ('Jeedipappu Pulao - Single', 'Single jeedipappu pulao.', 24900, 'veg-pulaos', 1),
    ('Chicken Joint Piece', 'Chicken joint piece curry add-on.', 18000, 'chitti-naidu-curries', 0),
    ('Chicken Fry Piece - Single Portion', 'Single portion chicken fry piece curry.', 14000, 'chitti-naidu-curries', 0),
    ('Chicken Curry - Single Portion', 'Single portion chicken curry.', 14000, 'chitti-naidu-curries', 0),
    ('Apricot Delight - 200gms', 'Dessert serving: 200gms.', 12000, 'chitti-naidu-desserts', 1),
    ('Bellam Junnu Homemade - 250gms', 'Homemade dessert serving: 250gms.', 14000, 'chitti-naidu-desserts', 1),
    ('Badam Paalu - 200ml', 'Badam paalu serving: 200ml.', 4000, 'chitti-naidu-desserts', 1),
    ('Badam Paalu - 500ml', 'Badam paalu serving: 500ml.', 9000, 'chitti-naidu-desserts', 1),
    ('Only Pulao Rice - Single Portion', 'Single portion pulao rice.', 10000, 'extra-add-ons', 1),
    ('Extra Egg', 'Extra egg add-on.', 1500, 'extra-add-ons', 0),
    ('Water Bottle', 'Water bottle.', 1000, 'extra-add-ons', 1)
)
insert into "menuItems" ("name", "description", "price", "category", "isVegetarian", "isAvailable")
select new_menu."name",
       new_menu."description",
       new_menu."price",
       new_menu."category",
       new_menu."isVegetarian",
       1
from new_menu
where not exists (
  select 1
  from "menuItems" existing
  where existing."name" = new_menu."name"
);
