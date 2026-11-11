import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const carpeta = new URL('../migrations/', import.meta.url)

// Lo mínimo de Supabase que usan las migraciones: auth, roles, permisos por defecto y la publicación.
const supabaseMinimo = `
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
create publication supabase_realtime;
`

export type Rol = 'admin' | 'mesero' | 'estacion'

export async function crearBase() {
  const db = new PGlite()
  await db.exec(supabaseMinimo)
  for (const archivo of readdirSync(carpeta).filter((a) => a.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(archivo, carpeta), 'utf8'))
  }
  return db
}

export async function crearUsuario(db: PGlite, nombre: string, rol: Rol, activo = true) {
  const id = crypto.randomUUID()
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [
    id,
    { nombre },
  ])
  await db.query('update public.perfiles set rol = $2, activo = $3 where id = $1', [
    id,
    rol,
    activo,
  ])
  return id
}

// Ejecuta como el rol de la API: `null` es anon. Siempre regresa a postgres.
export async function como<T>(db: PGlite, usuario: string | null, fn: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario ?? ''])
  await db.exec(`set role ${usuario ? 'authenticated' : 'anon'}`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

export async function filas<T>(db: PGlite, sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows
}
