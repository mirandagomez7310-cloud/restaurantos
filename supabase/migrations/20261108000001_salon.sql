-- E2 Salón y comandas: roles, mesas, días, cuentas, comandas y cola de impresión.
-- El dinero y las comandas solo se escriben por las funciones de abajo (RPC).

-- Roles ---------------------------------------------------------------------

alter table public.perfiles
  add column rol text not null default 'mesero'
  check (rol in ('admin', 'mesero', 'estacion'));

-- La familia entra como admin.
update public.perfiles set rol = 'admin' where activo;

-- Equipo = quien atiende el salón. La cuenta de estación no cuenta.
create or replace function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo and rol in ('admin', 'mesero')
  );
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo and rol = 'admin'
  );
$$;

create function public.es_estacion()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo and rol = 'estacion'
  );
$$;

-- Cada cuenta lee su propio perfil, para saber su rol aunque sea de estación.
create policy "cada quien lee su perfil" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));

-- El catálogo solo lo edita un admin.
drop policy "equipo crea categorias" on public.categorias;
drop policy "equipo edita categorias" on public.categorias;
drop policy "equipo crea productos" on public.productos;
drop policy "equipo edita productos" on public.productos;
drop policy "equipo crea modificadores" on public.modificadores;
drop policy "equipo edita modificadores" on public.modificadores;

create policy "admin crea categorias" on public.categorias
  for insert to authenticated with check ((select public.es_admin()));
create policy "admin edita categorias" on public.categorias
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "admin crea productos" on public.productos
  for insert to authenticated with check ((select public.es_admin()));
create policy "admin edita productos" on public.productos
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "admin crea modificadores" on public.modificadores
  for insert to authenticated with check ((select public.es_admin()));
create policy "admin edita modificadores" on public.modificadores
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Catálogo ------------------------------------------------------------------

create table public.estaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0
);

-- Nulo permitido: un producto sin estación existe, pero no se puede vender.
alter table public.productos
  add column estacion_id uuid references public.estaciones (id);

-- 'una': hay que elegir exactamente una opción del grupo (Sabor, Salsa).
alter table public.modificadores
  add column seleccion text not null default 'varias'
  check (seleccion in ('una', 'varias'));

-- Salón ---------------------------------------------------------------------

-- Posición y tamaño en celdas de la cuadrícula del plano.
create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (char_length(nombre) between 1 and 30),
  x int not null default 0 check (x between 0 and 99),
  y int not null default 0 check (y between 0 and 99),
  ancho int not null default 2 check (ancho between 1 and 10),
  alto int not null default 2 check (alto between 1 and 10),
  forma text not null default 'cuadrada' check (forma in ('cuadrada', 'redonda')),
  activa boolean not null default true,
  orden int not null default 0
);

create table public.dias_operativos (
  id uuid primary key,
  fecha_operativa date not null,
  fondo_centavos int not null default 0 check (fondo_centavos >= 0),
  abierto_en timestamptz not null default now(),
  abierto_por uuid not null references public.perfiles (id),
  cerrado_en timestamptz,
  cerrado_por uuid references public.perfiles (id),
  check ((cerrado_en is null) = (cerrado_por is null))
);

-- Solo un día abierto a la vez.
create unique index un_dia_abierto on public.dias_operativos ((true))
  where cerrado_en is null;

create table public.cuentas (
  id uuid primary key,
  dia_id uuid not null references public.dias_operativos (id),
  numero int not null,
  tipo text not null check (tipo in ('mesa', 'llevar', 'entrega')),
  mesa_id uuid references public.mesas (id),
  nombre text not null default '' check (char_length(nombre) <= 40),
  personas int check (personas between 1 and 99),
  mesero_id uuid not null references public.perfiles (id),
  estado text not null default 'abierta'
    check (estado in ('abierta', 'cerrada', 'anulada')),
  -- shortcut: en E2 el cobro sigue en la hoja; E5 lo sustituye por pagos reales.
  cobrada_fuera boolean not null default false,
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  cerrada_por uuid references public.perfiles (id),
  unique (dia_id, numero),
  check ((tipo = 'mesa') = (mesa_id is not null)),
  check ((estado = 'abierta') = (cerrada_en is null))
);

-- Una cuenta abierta por mesa.
create unique index una_cuenta_por_mesa on public.cuentas (mesa_id)
  where estado = 'abierta';

create table public.comandas (
  id uuid primary key,
  cuenta_id uuid not null references public.cuentas (id),
  dia_id uuid not null references public.dias_operativos (id),
  numero int not null,
  enviada_por uuid not null references public.perfiles (id),
  enviada_en timestamptz not null default now(),
  sin_conexion boolean not null default false,
  unique (dia_id, numero)
);

-- precio_unit_centavos ya incluye los modificadores; el total es precio × cantidad.
create table public.lineas (
  id uuid primary key,
  cuenta_id uuid not null references public.cuentas (id),
  producto_id uuid not null references public.productos (id),
  nombre text not null,
  precio_unit_centavos int not null check (precio_unit_centavos >= 0),
  cantidad int not null check (cantidad between 1 and 99),
  modificadores jsonb not null default '[]',
  observacion text not null default '' check (char_length(observacion) <= 200),
  estacion_id uuid not null references public.estaciones (id),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviada', 'cancelada')),
  comanda_id uuid references public.comandas (id),
  creada_por uuid not null references public.perfiles (id),
  creada_en timestamptz not null default now(),
  cancelacion_motivo text,
  cancelada_por uuid references public.perfiles (id),
  cancelada_en timestamptz,
  ya_preparada boolean,
  check (estado <> 'borrador' or comanda_id is null),
  check (estado <> 'enviada' or comanda_id is not null),
  check ((estado = 'cancelada') = (cancelada_en is not null))
);

create table public.dispositivos (
  id uuid primary key references public.perfiles (id),
  nombre text not null check (char_length(nombre) between 1 and 40),
  version text not null default '' check (char_length(version) <= 20),
  ultimo_latido timestamptz not null default now()
);

create table public.trabajos_impresion (
  id uuid primary key,
  tipo text not null
    check (tipo in ('comanda', 'cancelacion', 'precuenta', 'ticket_pago', 'prueba')),
  comanda_id uuid references public.comandas (id),
  estacion_id uuid references public.estaciones (id),
  -- Foto del ticket: la reimpresión sale idéntica aunque cambie el catálogo.
  contenido jsonb not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'tomado', 'impreso', 'fallido')),
  intentos int not null default 0,
  error text,
  reimpresion_de uuid references public.trabajos_impresion (id),
  copia int not null default 1,
  motivo text,
  solicitado_por uuid references public.perfiles (id),
  creado_en timestamptz not null default now(),
  tomado_en timestamptz,
  impreso_en timestamptz,
  check (reimpresion_de is null or motivo is not null)
);

create index cuentas_dia_idx on public.cuentas (dia_id);
create index lineas_cuenta_idx on public.lineas (cuenta_id);
create index lineas_comanda_idx on public.lineas (comanda_id);
create index comandas_cuenta_idx on public.comandas (cuenta_id);
create index trabajos_pendientes_idx on public.trabajos_impresion (creado_en)
  where estado in ('pendiente', 'tomado');
create index trabajos_comanda_idx on public.trabajos_impresion (comanda_id);

-- Bitácora: todo menos el latido, que cambia cada 15 s.
create trigger bitacora_estaciones after insert or update or delete on public.estaciones
  for each row execute function public.registrar_bitacora();
create trigger bitacora_mesas after insert or update or delete on public.mesas
  for each row execute function public.registrar_bitacora();
create trigger bitacora_dias after insert or update or delete on public.dias_operativos
  for each row execute function public.registrar_bitacora();
create trigger bitacora_cuentas after insert or update or delete on public.cuentas
  for each row execute function public.registrar_bitacora();
create trigger bitacora_comandas after insert or update or delete on public.comandas
  for each row execute function public.registrar_bitacora();
create trigger bitacora_lineas after insert or update or delete on public.lineas
  for each row execute function public.registrar_bitacora();
create trigger bitacora_trabajos after insert or update or delete on public.trabajos_impresion
  for each row execute function public.registrar_bitacora();
create trigger bitacora_perfiles after insert or update or delete on public.perfiles
  for each row execute function public.registrar_bitacora();

-- RLS -----------------------------------------------------------------------

alter table public.estaciones enable row level security;
alter table public.mesas enable row level security;
alter table public.dias_operativos enable row level security;
alter table public.cuentas enable row level security;
alter table public.comandas enable row level security;
alter table public.lineas enable row level security;
alter table public.dispositivos enable row level security;
alter table public.trabajos_impresion enable row level security;

create policy "equipo lee estaciones" on public.estaciones
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo lee mesas" on public.mesas
  for select to authenticated using ((select public.es_equipo()));
create policy "admin crea mesas" on public.mesas
  for insert to authenticated with check ((select public.es_admin()));
create policy "admin edita mesas" on public.mesas
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "equipo lee dias" on public.dias_operativos
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo lee cuentas" on public.cuentas
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo lee comandas" on public.comandas
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo lee lineas" on public.lineas
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo y estacion leen dispositivos" on public.dispositivos
  for select to authenticated
  using ((select public.es_equipo()) or (select public.es_estacion()));
create policy "equipo y estacion leen trabajos" on public.trabajos_impresion
  for select to authenticated
  using ((select public.es_equipo()) or (select public.es_estacion()));

-- Funciones internas ----------------------------------------------------------

-- Los mensajes llegan tal cual a la pantalla: en español y con qué hacer.
create function public.exigir(p_ok boolean, p_mensaje text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_ok is not true then
    raise exception using message = p_mensaje, errcode = 'P0001';
  end if;
end;
$$;

create function public.etiqueta_cuenta(p_cuenta public.cuentas)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_cuenta.tipo
    when 'mesa' then (select m.nombre from public.mesas m where m.id = p_cuenta.mesa_id)
    when 'llevar' then 'Para llevar ' || coalesce(nullif(p_cuenta.nombre, ''), '#' || p_cuenta.numero)
    else 'Entrega ' || coalesce(nullif(p_cuenta.nombre, ''), '#' || p_cuenta.numero)
  end;
$$;

create function public.nombre_perfil(p_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(p.nombre, ''), 'Sin nombre') from public.perfiles p where p.id = p_id;
$$;

-- Día -----------------------------------------------------------------------

create function public.abrir_dia(p_id uuid, p_fondo_centavos int default 0)
returns public.dias_operativos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dia public.dias_operativos;
begin
  perform public.exigir(public.es_admin(), 'Solo un admin puede abrir el día.');
  select * into v_dia from public.dias_operativos where id = p_id;
  if found then return v_dia; end if;
  perform public.exigir(
    not exists (select 1 from public.dias_operativos where cerrado_en is null),
    'Ya hay un día abierto.');
  perform public.exigir(coalesce(p_fondo_centavos, 0) >= 0, 'El fondo no puede ser negativo.');
  insert into public.dias_operativos (id, fecha_operativa, fondo_centavos, abierto_por)
  values (
    p_id,
    (now() at time zone 'America/Mexico_City')::date,
    coalesce(p_fondo_centavos, 0),
    auth.uid())
  returning * into v_dia;
  return v_dia;
end;
$$;

create function public.cerrar_dia(p_dia_id uuid)
returns public.dias_operativos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dia public.dias_operativos;
begin
  perform public.exigir(public.es_admin(), 'Solo un admin puede cerrar el día.');
  select * into v_dia from public.dias_operativos where id = p_dia_id for update;
  perform public.exigir(found, 'Ese día no existe.');
  if v_dia.cerrado_en is not null then return v_dia; end if;
  perform public.exigir(
    not exists (select 1 from public.cuentas where dia_id = p_dia_id and estado = 'abierta'),
    'Quedan cuentas abiertas: ciérralas antes de cerrar el día.');
  update public.dias_operativos
  set cerrado_en = now(), cerrado_por = auth.uid()
  where id = p_dia_id
  returning * into v_dia;
  return v_dia;
end;
$$;

-- Cuentas ---------------------------------------------------------------------

-- Si la mesa ya tiene cuenta abierta, devuelve esa: dos meseros comparten la mesa.
create function public.abrir_cuenta(
  p_id uuid,
  p_tipo text,
  p_mesa_id uuid default null,
  p_personas int default null,
  p_nombre text default ''
)
returns public.cuentas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuenta public.cuentas;
  v_dia public.dias_operativos;
begin
  perform public.exigir(public.es_equipo(), 'Tu cuenta no tiene permiso para atender mesas.');
  select * into v_cuenta from public.cuentas where id = p_id;
  if found then return v_cuenta; end if;

  select * into v_dia from public.dias_operativos where cerrado_en is null for update;
  perform public.exigir(found, 'No hay un día abierto. Pide a un admin que lo abra.');
  perform public.exigir(p_tipo in ('mesa', 'llevar', 'entrega'), 'Tipo de cuenta no válido.');

  if p_tipo = 'mesa' then
    perform public.exigir(
      exists (select 1 from public.mesas where id = p_mesa_id and activa),
      'Esa mesa no existe o está desactivada.');
    select * into v_cuenta from public.cuentas
    where mesa_id = p_mesa_id and estado = 'abierta';
    if found then return v_cuenta; end if;
  else
    p_mesa_id := null;
  end if;

  insert into public.cuentas (id, dia_id, numero, tipo, mesa_id, nombre, personas, mesero_id)
  values (
    p_id,
    v_dia.id,
    coalesce((select max(numero) from public.cuentas where dia_id = v_dia.id), 0) + 1,
    p_tipo,
    p_mesa_id,
    left(trim(coalesce(p_nombre, '')), 40),
    p_personas,
    auth.uid())
  returning * into v_cuenta;
  return v_cuenta;
end;
$$;

create function public.cuenta_abierta_para_editar(p_cuenta_id uuid)
returns public.cuentas
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta public.cuentas;
begin
  select * into v_cuenta from public.cuentas where id = p_cuenta_id for update;
  perform public.exigir(found, 'Esa cuenta no existe.');
  perform public.exigir(v_cuenta.estado = 'abierta', 'Esa cuenta ya está cerrada.');
  return v_cuenta;
end;
$$;

create function public.agregar_linea(
  p_id uuid,
  p_cuenta_id uuid,
  p_producto_id uuid,
  p_cantidad int,
  p_modificador_ids uuid[] default '{}',
  p_observacion text default ''
)
returns public.lineas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linea public.lineas;
  v_producto public.productos;
  v_ids uuid[] := coalesce(p_modificador_ids, '{}');
  v_falta text;
  v_extra int;
  v_mods jsonb;
  v_obs text := trim(coalesce(p_observacion, ''));
begin
  perform public.exigir(public.es_equipo(), 'Tu cuenta no tiene permiso para atender mesas.');
  select * into v_linea from public.lineas where id = p_id;
  if found then return v_linea; end if;

  perform public.cuenta_abierta_para_editar(p_cuenta_id);
  perform public.exigir(p_cantidad between 1 and 99, 'La cantidad va de 1 a 99.');
  perform public.exigir(char_length(v_obs) <= 200, 'La observación es muy larga (máximo 200 letras).');

  select * into v_producto from public.productos where id = p_producto_id;
  perform public.exigir(found and v_producto.activo, 'Ese producto ya no está en el menú.');
  perform public.exigir(v_producto.disponible, v_producto.nombre || ' está agotado.');
  perform public.exigir(
    v_producto.estacion_id is not null,
    v_producto.nombre || ' no tiene estación (cocina o barra). Pide a un admin que la asigne.');

  perform public.exigir(
    (select count(*) from public.modificadores
     where id = any (v_ids) and producto_id = p_producto_id and activo)
      = (select count(distinct x) from unnest(v_ids) x),
    'Una de las opciones no es válida para este producto.');

  select m.grupo into v_falta
  from public.modificadores m
  where m.producto_id = p_producto_id and m.activo and m.seleccion = 'una'
  group by m.grupo
  having count(*) filter (where m.id = any (v_ids)) <> 1
  order by m.grupo
  limit 1;
  perform public.exigir(v_falta is null, 'Elige una opción de ' || coalesce(v_falta, '') || '.');

  select coalesce(sum(m.precio_centavos), 0),
         coalesce(jsonb_agg(
           jsonb_build_object('grupo', m.grupo, 'nombre', m.nombre, 'precio_centavos', m.precio_centavos)
           order by m.grupo, m.nombre), '[]')
  into v_extra, v_mods
  from public.modificadores m
  where m.id = any (v_ids);

  insert into public.lineas (
    id, cuenta_id, producto_id, nombre, precio_unit_centavos, cantidad,
    modificadores, observacion, estacion_id, creada_por)
  values (
    p_id, p_cuenta_id, p_producto_id, v_producto.nombre, v_producto.precio_centavos + v_extra,
    p_cantidad, v_mods, v_obs, v_producto.estacion_id, auth.uid())
  returning * into v_linea;
  return v_linea;
end;
$$;

create function public.quitar_borrador(p_linea_id uuid)
returns public.lineas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linea public.lineas;
begin
  perform public.exigir(public.es_equipo(), 'Tu cuenta no tiene permiso para atender mesas.');
  select * into v_linea from public.lineas where id = p_linea_id;
  perform public.exigir(found, 'Esa línea no existe.');
  perform public.cuenta_abierta_para_editar(v_linea.cuenta_id);
  select * into v_linea from public.lineas where id = p_linea_id for update;
  if v_linea.estado = 'cancelada' then return v_linea; end if;
  perform public.exigir(
    v_linea.estado = 'borrador',
    'Eso ya se envió a cocina: un admin debe cancelarlo con motivo.');
  update public.lineas
  set estado = 'cancelada', cancelacion_motivo = 'Quitada antes de enviar',
      cancelada_por = auth.uid(), cancelada_en = now()
  where id = p_linea_id
  returning * into v_linea;
  return v_linea;
end;
$$;

create function public.enviar_comanda(p_id uuid, p_cuenta_id uuid)
returns public.comandas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comanda public.comandas;
  v_cuenta public.cuentas;
  v_dia public.dias_operativos;
  v_orden int;
  v_estacion record;
begin
  perform public.exigir(public.es_equipo(), 'Tu cuenta no tiene permiso para atender mesas.');
  select * into v_comanda from public.comandas where id = p_id;
  if found then return v_comanda; end if;

  v_cuenta := public.cuenta_abierta_para_editar(p_cuenta_id);
  perform public.exigir(
    exists (select 1 from public.lineas where cuenta_id = p_cuenta_id and estado = 'borrador'),
    'No hay nada nuevo que enviar.');

  -- Bloquea el día para que dos envíos no tomen el mismo número.
  select * into v_dia from public.dias_operativos where id = v_cuenta.dia_id for update;

  insert into public.comandas (id, cuenta_id, dia_id, numero, enviada_por)
  values (
    p_id, p_cuenta_id, v_dia.id,
    coalesce((select max(numero) from public.comandas where dia_id = v_dia.id), 0) + 1,
    auth.uid())
  returning * into v_comanda;

  update public.lineas set estado = 'enviada', comanda_id = p_id
  where cuenta_id = p_cuenta_id and estado = 'borrador';

  select count(*) into v_orden from public.comandas where cuenta_id = p_cuenta_id;

  for v_estacion in
    select distinct e.id, e.nombre, e.orden
    from public.lineas l join public.estaciones e on e.id = l.estacion_id
    where l.comanda_id = p_id
    order by e.orden
  loop
    insert into public.trabajos_impresion (id, tipo, comanda_id, estacion_id, contenido, solicitado_por)
    values (
      gen_random_uuid(), 'comanda', p_id, v_estacion.id,
      jsonb_build_object(
        'tipo', 'comanda',
        'estacion', v_estacion.nombre,
        'numero', v_comanda.numero,
        'cuenta', public.etiqueta_cuenta(v_cuenta),
        'mesero', public.nombre_perfil(auth.uid()),
        'fecha', v_comanda.enviada_en,
        'orden_en_cuenta', v_orden,
        'sin_conexion', v_comanda.sin_conexion,
        'lineas', (
          select jsonb_agg(jsonb_build_object(
            'cantidad', l.cantidad,
            'nombre', l.nombre,
            'modificadores', (select coalesce(jsonb_agg(m ->> 'nombre'), '[]') from jsonb_array_elements(l.modificadores) m),
            'observacion', l.observacion) order by l.creada_en, l.id)
          from public.lineas l
          where l.comanda_id = p_id and l.estacion_id = v_estacion.id)),
      auth.uid());
  end loop;

  return v_comanda;
end;
$$;

create function public.cancelar_linea(p_linea_id uuid, p_motivo text, p_ya_preparada boolean)
returns public.lineas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linea public.lineas;
  v_cuenta public.cuentas;
  v_motivo text := trim(coalesce(p_motivo, ''));
begin
  perform public.exigir(public.es_admin(), 'Solo un admin puede cancelar algo ya enviado.');
  select * into v_linea from public.lineas where id = p_linea_id;
  perform public.exigir(found, 'Esa línea no existe.');
  v_cuenta := public.cuenta_abierta_para_editar(v_linea.cuenta_id);
  select * into v_linea from public.lineas where id = p_linea_id for update;
  if v_linea.estado = 'cancelada' then return v_linea; end if;
  perform public.exigir(v_linea.estado = 'enviada', 'Esa línea no se ha enviado: quítala sin motivo.');
  perform public.exigir(char_length(v_motivo) between 3 and 200, 'Escribe el motivo de la cancelación.');
  perform public.exigir(p_ya_preparada is not null, 'Indica si ya estaba preparado.');

  update public.lineas
  set estado = 'cancelada', cancelacion_motivo = v_motivo, ya_preparada = p_ya_preparada,
      cancelada_por = auth.uid(), cancelada_en = now()
  where id = p_linea_id
  returning * into v_linea;

  insert into public.trabajos_impresion (id, tipo, comanda_id, estacion_id, contenido, motivo, solicitado_por)
  select
    gen_random_uuid(), 'cancelacion', v_linea.comanda_id, v_linea.estacion_id,
    jsonb_build_object(
      'tipo', 'cancelacion',
      'estacion', e.nombre,
      'numero', c.numero,
      'cuenta', public.etiqueta_cuenta(v_cuenta),
      'mesero', public.nombre_perfil(auth.uid()),
      'fecha', v_linea.cancelada_en,
      'motivo', v_motivo,
      'lineas', jsonb_build_array(jsonb_build_object(
        'cantidad', v_linea.cantidad,
        'nombre', v_linea.nombre,
        'modificadores', (select coalesce(jsonb_agg(m ->> 'nombre'), '[]') from jsonb_array_elements(v_linea.modificadores) m),
        'observacion', v_linea.observacion))),
    v_motivo, auth.uid()
  from public.estaciones e, public.comandas c
  where e.id = v_linea.estacion_id and c.id = v_linea.comanda_id;

  return v_linea;
end;
$$;

-- Cuenta abierta por error, sin nada enviado: se anula sin dejar rastro en caja.
create function public.anular_cuenta_vacia(p_cuenta_id uuid)
returns public.cuentas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuenta public.cuentas;
begin
  perform public.exigir(public.es_equipo(), 'Tu cuenta no tiene permiso para atender mesas.');
  select * into v_cuenta from public.cuentas where id = p_cuenta_id for update;
  perform public.exigir(found, 'Esa cuenta no existe.');
  if v_cuenta.estado = 'anulada' then return v_cuenta; end if;
  perform public.exigir(v_cuenta.estado = 'abierta', 'Esa cuenta ya está cerrada.');
  perform public.exigir(
    not exists (select 1 from public.lineas where cuenta_id = p_cuenta_id and estado = 'enviada'),
    'La cuenta ya tiene productos enviados: no se puede anular.');
  update public.lineas
  set estado = 'cancelada', cancelacion_motivo = 'Cuenta anulada',
      cancelada_por = auth.uid(), cancelada_en = now()
  where cuenta_id = p_cuenta_id and estado = 'borrador';
  update public.cuentas
  set estado = 'anulada', cerrada_en = now(), cerrada_por = auth.uid()
  where id = p_cuenta_id
  returning * into v_cuenta;
  return v_cuenta;
end;
$$;

-- shortcut: cierre sin cobro mientras la caja sigue en la hoja; se quita en E5.
create function public.cerrar_cuenta_fuera(p_cuenta_id uuid)
returns public.cuentas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuenta public.cuentas;
begin
  perform public.exigir(public.es_admin(), 'Solo un admin puede cerrar cuentas.');
  select * into v_cuenta from public.cuentas where id = p_cuenta_id for update;
  perform public.exigir(found, 'Esa cuenta no existe.');
  if v_cuenta.estado <> 'abierta' then return v_cuenta; end if;
  perform public.exigir(
    not exists (select 1 from public.lineas where cuenta_id = p_cuenta_id and estado = 'borrador'),
    'Hay productos sin enviar: envíalos o quítalos.');
  update public.cuentas
  set estado = 'cerrada', cobrada_fuera = true, cerrada_en = now(), cerrada_por = auth.uid()
  where id = p_cuenta_id
  returning * into v_cuenta;
  return v_cuenta;
end;
$$;

-- Impresión -------------------------------------------------------------------

create function public.reimprimir(p_id uuid, p_trabajo_id uuid, p_motivo text)
returns public.trabajos_impresion
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos_impresion;
  v_original public.trabajos_impresion;
  v_raiz uuid;
  v_copia int;
  v_motivo text := trim(coalesce(p_motivo, ''));
begin
  perform public.exigir(public.es_admin(), 'Solo un admin puede reimprimir.');
  select * into v_trabajo from public.trabajos_impresion where id = p_id;
  if found then return v_trabajo; end if;
  perform public.exigir(char_length(v_motivo) between 3 and 200, 'Escribe el motivo de la reimpresión.');
  select * into v_original from public.trabajos_impresion where id = p_trabajo_id;
  perform public.exigir(found, 'Ese ticket no existe.');

  v_raiz := coalesce(v_original.reimpresion_de, v_original.id);
  perform 1 from public.trabajos_impresion where id = v_raiz for update;
  select max(copia) + 1 into v_copia from public.trabajos_impresion
  where id = v_raiz or reimpresion_de = v_raiz;

  insert into public.trabajos_impresion (
    id, tipo, comanda_id, estacion_id, contenido, reimpresion_de, copia, motivo, solicitado_por)
  values (
    p_id, v_original.tipo, v_original.comanda_id, v_original.estacion_id,
    v_original.contenido || jsonb_build_object('copia', v_copia),
    v_raiz, v_copia, v_motivo, auth.uid())
  returning * into v_trabajo;
  return v_trabajo;
end;
$$;

-- Para el agente de E4. Un trabajo «tomado» hace más de 60 s se da por perdido.
create function public.tomar_trabajo()
returns setof public.trabajos_impresion
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.exigir(public.es_estacion(), 'Solo la estación de impresión toma trabajos.');
  select id into v_id from public.trabajos_impresion
  where estado = 'pendiente' or (estado = 'tomado' and tomado_en < now() - interval '60 seconds')
  order by creado_en
  limit 1
  for update skip locked;
  if v_id is null then return; end if;
  return query
    update public.trabajos_impresion set estado = 'tomado', tomado_en = now()
    where id = v_id
    returning *;
end;
$$;

create function public.confirmar_impresion(p_trabajo_id uuid, p_ok boolean, p_error text default null)
returns public.trabajos_impresion
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos_impresion;
begin
  perform public.exigir(public.es_estacion(), 'Solo la estación de impresión confirma trabajos.');
  select * into v_trabajo from public.trabajos_impresion where id = p_trabajo_id for update;
  perform public.exigir(found, 'Ese ticket no existe.');
  if v_trabajo.estado = 'impreso' then return v_trabajo; end if;
  if p_ok then
    update public.trabajos_impresion
    set estado = 'impreso', impreso_en = now(), error = null
    where id = p_trabajo_id
    returning * into v_trabajo;
  else
    -- Tres fallos seguidos y se deja de reintentar: queda a la vista para reimprimir.
    update public.trabajos_impresion
    set intentos = intentos + 1,
        error = left(coalesce(p_error, 'Error desconocido'), 300),
        estado = case when intentos + 1 >= 3 then 'fallido' else 'pendiente' end
    where id = p_trabajo_id
    returning * into v_trabajo;
  end if;
  return v_trabajo;
end;
$$;

create function public.latido(p_nombre text, p_version text default '')
returns public.dispositivos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispositivo public.dispositivos;
begin
  perform public.exigir(public.es_estacion(), 'Solo la estación de impresión envía latidos.');
  insert into public.dispositivos (id, nombre, version)
  values (auth.uid(), left(coalesce(nullif(trim(p_nombre), ''), 'Estación'), 40), left(coalesce(p_version, ''), 20))
  on conflict (id) do update
    set ultimo_latido = now(), nombre = excluded.nombre, version = excluded.version
  returning * into v_dispositivo;
  return v_dispositivo;
end;
$$;

-- Permisos --------------------------------------------------------------------

-- Supabase da por defecto todos los permisos a anon y authenticated en tablas nuevas.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on public.estaciones, public.dias_operativos,
  public.cuentas, public.comandas, public.lineas, public.dispositivos,
  public.trabajos_impresion from authenticated;

revoke execute on function
  public.es_admin(), public.es_estacion(), public.exigir(boolean, text),
  public.etiqueta_cuenta(public.cuentas), public.nombre_perfil(uuid),
  public.cuenta_abierta_para_editar(uuid),
  public.abrir_dia(uuid, int), public.cerrar_dia(uuid),
  public.abrir_cuenta(uuid, text, uuid, int, text),
  public.agregar_linea(uuid, uuid, uuid, int, uuid[], text),
  public.quitar_borrador(uuid), public.enviar_comanda(uuid, uuid),
  public.cancelar_linea(uuid, text, boolean), public.anular_cuenta_vacia(uuid),
  public.cerrar_cuenta_fuera(uuid), public.reimprimir(uuid, uuid, text),
  public.tomar_trabajo(), public.confirmar_impresion(uuid, boolean, text),
  public.latido(text, text)
from public, anon;

-- Las internas no se llaman desde fuera.
revoke execute on function
  public.exigir(boolean, text), public.etiqueta_cuenta(public.cuentas),
  public.nombre_perfil(uuid), public.cuenta_abierta_para_editar(uuid)
from authenticated;

grant execute on function
  public.es_admin(), public.es_estacion(),
  public.abrir_dia(uuid, int), public.cerrar_dia(uuid),
  public.abrir_cuenta(uuid, text, uuid, int, text),
  public.agregar_linea(uuid, uuid, uuid, int, uuid[], text),
  public.quitar_borrador(uuid), public.enviar_comanda(uuid, uuid),
  public.cancelar_linea(uuid, text, boolean), public.anular_cuenta_vacia(uuid),
  public.cerrar_cuenta_fuera(uuid), public.reimprimir(uuid, uuid, text),
  public.tomar_trabajo(), public.confirmar_impresion(uuid, boolean, text),
  public.latido(text, text)
to authenticated;

-- Tiempo real -----------------------------------------------------------------

alter publication supabase_realtime add table
  public.mesas, public.cuentas, public.lineas, public.comandas,
  public.trabajos_impresion, public.dispositivos;
