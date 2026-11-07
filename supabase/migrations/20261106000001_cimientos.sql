-- Cimientos: equipo, catálogo y bitácora. Nada se borra: se desactiva.

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  -- Una cuenta nueva no ve nada hasta que se activa a mano.
  activo boolean not null default false,
  creado_en timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id),
  nombre text not null,
  precio_centavos int not null check (precio_centavos >= 0),
  es_alcohol boolean not null default false,
  visible_web boolean not null default false,
  favorito boolean not null default false,
  disponible boolean not null default true,
  activo boolean not null default true,
  unique (categoria_id, nombre),
  -- Los permisos no admiten anunciar alcohol: la base de datos lo impide.
  constraint alcohol_fuera_de_la_web check (not (es_alcohol and visible_web))
);

create table public.modificadores (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  grupo text not null,
  nombre text not null,
  precio_centavos int not null default 0 check (precio_centavos >= 0),
  activo boolean not null default true,
  unique (producto_id, grupo, nombre)
);

create table public.bitacora (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text not null,
  accion text not null,
  antes jsonb,
  despues jsonb,
  usuario_id uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

create index productos_categoria_idx on public.productos (categoria_id);
create index modificadores_producto_idx on public.modificadores (producto_id);
create index bitacora_registro_idx on public.bitacora (tabla, registro_id);

-- Quien entra debe tener un perfil activo.
create function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo
  );
$$;

create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

create function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.bitacora (tabla, registro_id, accion, antes, despues)
  values (
    tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    tg_op,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger bitacora_categorias after insert or update or delete on public.categorias
  for each row execute function public.registrar_bitacora();
create trigger bitacora_productos after insert or update or delete on public.productos
  for each row execute function public.registrar_bitacora();
create trigger bitacora_modificadores after insert or update or delete on public.modificadores
  for each row execute function public.registrar_bitacora();

alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.modificadores enable row level security;
alter table public.bitacora enable row level security;

-- Sin políticas de borrado: nadie borra desde la app.
create policy "equipo lee perfiles" on public.perfiles
  for select to authenticated using ((select public.es_equipo()));

create policy "equipo lee categorias" on public.categorias
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo crea categorias" on public.categorias
  for insert to authenticated with check ((select public.es_equipo()));
create policy "equipo edita categorias" on public.categorias
  for update to authenticated
  using ((select public.es_equipo())) with check ((select public.es_equipo()));

create policy "equipo lee productos" on public.productos
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo crea productos" on public.productos
  for insert to authenticated with check ((select public.es_equipo()));
create policy "equipo edita productos" on public.productos
  for update to authenticated
  using ((select public.es_equipo())) with check ((select public.es_equipo()));

create policy "equipo lee modificadores" on public.modificadores
  for select to authenticated using ((select public.es_equipo()));
create policy "equipo crea modificadores" on public.modificadores
  for insert to authenticated with check ((select public.es_equipo()));
create policy "equipo edita modificadores" on public.modificadores
  for update to authenticated
  using ((select public.es_equipo())) with check ((select public.es_equipo()));

create policy "equipo lee bitacora" on public.bitacora
  for select to authenticated using ((select public.es_equipo()));

revoke all on all tables in schema public from anon;
revoke execute on function public.crear_perfil() from public, anon, authenticated;
revoke execute on function public.registrar_bitacora() from public, anon, authenticated;
revoke execute on function public.es_equipo() from public, anon;
