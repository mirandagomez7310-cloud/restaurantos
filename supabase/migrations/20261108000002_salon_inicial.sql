-- Estaciones, mesas y reglas de opciones. Decisiones de Miranda del 7 y 8 nov 2026.

insert into public.estaciones (nombre, orden) values ('Cocina', 1), ('Barra', 2);

update public.productos p
set estacion_id = e.id
from public.categorias c, public.estaciones e
where c.id = p.categoria_id
  and e.nombre = case
    when c.nombre in ('Bebidas sin alcohol', 'Cervezas', 'Preparadas con cerveza', 'Coctelería')
      then 'Barra'
    else 'Cocina'
  end;

-- Un sabor de alitas y una salsa de chilaquiles, obligatorios. Los extras son libres.
update public.modificadores set seleccion = 'una' where grupo in ('Sabor', 'Salsa');

-- Cuadrícula provisional: Miranda las acomoda en el plano.
insert into public.mesas (nombre, x, y, orden) values
  ('Mesa 1', 0, 0, 1), ('Mesa 2', 3, 0, 2), ('Mesa 3', 6, 0, 3),
  ('Mesa 4', 0, 3, 4), ('Mesa 5', 3, 3, 5), ('Mesa 6', 6, 3, 6);
