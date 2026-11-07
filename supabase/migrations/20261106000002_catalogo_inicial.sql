-- Catálogo del menú impreso con las correcciones de Miranda del 6 nov 2026.
-- Sangría y tarritos se marcan con alcohol por precaución hasta confirmar.

insert into public.categorias (nombre, orden) values
  ('Hamburguesas', 1), ('Tacos', 2), ('Parrilla', 3), ('Alitas', 4), ('Papas', 5),
  ('Tortas', 6), ('Quesos fundidos', 7), ('Molletes', 8), ('Chilaquiles', 9),
  ('Nachos', 10), ('Infantil', 11), ('Bebidas sin alcohol', 12), ('Cervezas', 13),
  ('Preparadas con cerveza', 14), ('Coctelería', 15);

insert into public.productos
  (categoria_id, nombre, precio_centavos, es_alcohol, visible_web, favorito, activo)
select c.id, v.nombre, v.precio, v.alcohol, v.web, v.favorito, v.activo
from (values
  ('Hamburguesas', 'La Náufrago', 15000, false, true, true, true),
  ('Hamburguesas', 'La Isla Clásica', 14000, false, true, true, true),
  ('Hamburguesas', 'La Palmera', 13500, false, true, true, true),
  ('Tacos', 'Bistec', 3800, false, true, true, true),
  ('Tacos', 'Costilla', 3800, false, true, true, true),
  ('Tacos', 'Aguja norteña', 3800, false, true, true, true),
  ('Tacos', 'Campechano', 3800, false, true, true, true),
  ('Tacos', 'Chorizo argentino', 3800, false, true, true, true),
  ('Tacos', 'Chistorra', 3800, false, true, true, true),
  ('Tacos', 'Longaniza', 3800, false, true, true, true),
  ('Tacos', 'Cecina enchilada', 3800, false, true, true, true),
  ('Tacos', 'Arrachera', 4800, false, true, true, true),
  ('Tacos', 'Picaña', 4800, false, true, true, true),
  ('Tacos', 'Barriga', 4800, false, true, true, true),
  ('Parrilla', 'Trompito de pastor', 9500, false, true, false, true),
  ('Parrilla', 'Carnita sola', 18500, false, true, false, true),
  ('Parrilla', 'Parrillada surtida', 41000, false, true, false, true),
  ('Parrilla', 'Alambre de bistec', 15000, false, true, false, true),
  ('Alitas', 'Alitas (6 piezas)', 9500, false, true, true, true),
  ('Papas', 'Papas fritas', 7500, false, true, false, true),
  ('Papas', 'Salchipapas', 8500, false, true, false, true),
  ('Papas', 'Papas con tocino', 9500, false, true, false, true),
  ('Tortas', 'Pepito', 14500, false, true, false, true),
  ('Tortas', 'Choripán', 9500, false, true, false, true),
  ('Quesos fundidos', 'Queso fundido sencillo', 7500, false, true, false, true),
  ('Quesos fundidos', 'Queso fundido tradicional', 8500, false, true, false, true),
  ('Quesos fundidos', 'Queso fundido especial', 9500, false, true, false, true),
  ('Molletes', 'Molletes sencillos', 7000, false, true, false, true),
  ('Molletes', 'Molletes con longaniza', 8500, false, true, false, true),
  ('Molletes', 'Molletes con chistorra o chorizo argentino', 9500, false, true, false, true),
  ('Molletes', 'Molletes con arrachera', 12000, false, true, false, true),
  ('Chilaquiles', 'Chilaquiles con huevo', 8000, false, true, false, true),
  ('Chilaquiles', 'Chilaquiles con bistec o costilla', 13500, false, true, false, true),
  ('Chilaquiles', 'Chilaquiles con arrachera', 16500, false, true, false, true),
  ('Nachos', 'Nachos sencillos', 8000, false, true, false, true),
  ('Nachos', 'Nachos con chistorra', 10000, false, true, false, true),
  ('Nachos', 'Nachos con arrachera', 13500, false, true, false, true),
  ('Infantil', 'Nuggets', 6500, false, true, false, true),
  ('Infantil', 'Hot dog', 3500, false, true, false, true),
  ('Infantil', 'Sincronizada', 4500, false, true, false, true),
  ('Bebidas sin alcohol', 'Naranjada ½ L', 5500, false, true, false, true),
  ('Bebidas sin alcohol', 'Limonada ½ L', 5500, false, true, false, true),
  ('Bebidas sin alcohol', 'Refresco 355 ml', 2500, false, true, false, true),
  ('Bebidas sin alcohol', 'Refresco 600 ml', 3500, false, true, false, true),
  ('Bebidas sin alcohol', 'Mineral preparada 1 L', 9500, false, true, false, true),
  ('Bebidas sin alcohol', 'Mineral preparada ½ L', 5500, false, true, false, true),
  ('Bebidas sin alcohol', 'Azulito baby ½ L', 6500, false, true, false, true),
  ('Bebidas sin alcohol', 'Sangría preparada ½ L', 6500, true, false, false, true),
  ('Cervezas', 'Modelo mega', 12000, true, false, false, true),
  ('Cervezas', 'Corona / Victoria mega', 11000, true, false, false, true),
  ('Cervezas', 'Modelo mediana', 5500, true, false, false, true),
  ('Cervezas', 'Corona / Victoria mediana', 4500, true, false, false, true),
  ('Cervezas', 'Cerveza sin alcohol 350 ml', 4500, false, false, false, true),
  ('Preparadas con cerveza', 'Voltchela 1 L', 13000, true, false, false, true),
  ('Preparadas con cerveza', 'Clamachela 1 L', 13000, true, false, false, true),
  ('Preparadas con cerveza', 'Cubana 1 L', 12000, true, false, false, true),
  ('Preparadas con cerveza', 'Clásica 1 L', 11500, true, false, false, true),
  ('Preparadas con cerveza', 'Tarrito limón y sal ½', 1500, true, false, false, true),
  ('Preparadas con cerveza', 'Tarrito Clamato ½', 2500, true, false, false, true),
  ('Preparadas con cerveza', 'Tarrito cubano ½', 2000, true, false, false, true),
  ('Coctelería', 'Mojito 1 L', 13500, true, false, false, true),
  ('Coctelería', 'Mojito ½ L', 8500, true, false, false, true),
  ('Coctelería', 'Paloma 1 L', 13000, true, false, false, true),
  ('Coctelería', 'Paloma ½ L', 8500, true, false, false, false),
  ('Coctelería', 'Cantarito 1 L', 14500, true, false, false, true),
  ('Coctelería', 'Cuba 1 L', 13000, true, false, false, true),
  ('Coctelería', 'Cubaby ½ L', 7500, true, false, false, true),
  ('Coctelería', 'Mezcalita 350 ml', 8500, true, false, true, true),
  ('Coctelería', 'Frappeado', 9500, true, false, false, true),
  ('Coctelería', 'Azulito 1 L', 13000, true, false, false, true)
) as v (categoria, nombre, precio, alcohol, web, favorito, activo)
join public.categorias c on c.nombre = v.categoria;

-- Extras y opciones del menú.
insert into public.modificadores (producto_id, grupo, nombre, precio_centavos)
select p.id, m.grupo, m.nombre, m.precio
from public.productos p
join public.categorias c on c.id = p.categoria_id
join (values
  ('Hamburguesas', 'Extras', 'Queso', 1500),
  ('Hamburguesas', 'Extras', 'Tocino', 1500),
  ('Hamburguesas', 'Extras', 'Piña', 1500),
  ('Hamburguesas', 'Extras', 'Jamón', 1500),
  ('Tacos', 'Extras', 'Queso', 1000),
  ('Papas', 'Extras', 'Queso amarillo', 0),
  ('Alitas', 'Sabor', 'Red Hot', 0),
  ('Alitas', 'Sabor', 'BBQ', 0),
  ('Alitas', 'Sabor', 'BBQ Hot', 0),
  ('Alitas', 'Sabor', 'Mango Habanero', 0),
  ('Alitas', 'Sabor', 'Piña Hot', 0),
  ('Alitas', 'Sabor', 'Búfalo', 0),
  ('Chilaquiles', 'Salsa', 'Verde', 0),
  ('Chilaquiles', 'Salsa', 'Roja', 0)
) as m (categoria, grupo, nombre, precio) on m.categoria = c.nombre;
