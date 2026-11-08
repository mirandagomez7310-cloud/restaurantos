#!/usr/bin/env bash
# Respaldo nocturno: copia, prueba de restauración, cifrado y subida a Drive.
# Si cualquier paso falla, el workflow falla y GitHub avisa por correo.
set -euo pipefail

: "${DB_URL:?Falta el secreto RESPALDO_DB_URL}"
: "${RCLONE_CONFIG_CONTENIDO:?Falta el secreto RCLONE_CONFIG}"
: "${PRUEBA_URL:?Falta PRUEBA_URL}"

# Un secreto guardado desde PowerShell llega con BOM y CRLF: se limpian.
limpiar() {
  local valor="${1#$'\xEF\xBB\xBF'}"
  printf '%s' "${valor//$'\r'/}"
}
DB_URL=$(limpiar "$DB_URL")
RCLONE_CONFIG_CONTENIDO=$(limpiar "$RCLONE_CONFIG_CONTENIDO")
echo "::add-mask::$DB_URL"

PG=/usr/lib/postgresql/17/bin
DESTINO='drive:Respaldos La Isla'
fecha=$(TZ=America/Mexico_City date +%F)
archivo="la-isla-$fecha.dump"
trabajo=$(mktemp -d)
trap 'rm -rf "$trabajo"' EXIT

echo '1/4 Copia de la base de datos'
"$PG/pg_dump" "$DB_URL" --format=custom --schema=public --schema=auth \
  --no-owner --no-privileges --file "$trabajo/$archivo"

echo '2/4 Prueba de restauración'
# Roles de Supabase que usan las políticas de RLS; el dump trae su propio esquema public.
"$PG/psql" "$PRUEBA_URL" -q -v ON_ERROR_STOP=1 \
  -c 'create role anon nologin; create role authenticated nologin; create role service_role nologin;' \
  -c 'drop schema public cascade;'
"$PG/pg_restore" --no-owner --no-privileges --exit-on-error \
  --dbname "$PRUEBA_URL" "$trabajo/$archivo"

contar() {
  "$PG/psql" "$1" -At -v ON_ERROR_STOP=1 <<'SQL'
select format('select %L || '' '' || count(*) from %I.%I;',
              schemaname || '.' || tablename, schemaname, tablename)
from pg_tables
where schemaname = 'public' or (schemaname = 'auth' and tablename = 'users')
order by 1
\gexec
SQL
}
contar "$DB_URL" >"$trabajo/origen.txt"
contar "$PRUEBA_URL" >"$trabajo/restaurado.txt"
if ! diff "$trabajo/origen.txt" "$trabajo/restaurado.txt"; then
  echo 'ERROR: el respaldo restaurado no tiene las mismas filas que la base de datos' >&2
  exit 1
fi
if [ ! -s "$trabajo/origen.txt" ]; then
  echo 'ERROR: no se encontró ninguna tabla' >&2
  exit 1
fi
cat "$trabajo/restaurado.txt"

echo '3/4 Cifrado'
age --recipients-file respaldo/llave-publica.txt \
  --output "$trabajo/$archivo.age" "$trabajo/$archivo"
rm "$trabajo/$archivo"

echo '4/4 Subida a Drive'
printf '%s\n' "$RCLONE_CONFIG_CONTENIDO" >"$trabajo/rclone.conf"
export RCLONE_CONFIG="$trabajo/rclone.conf"
rclone copyto "$trabajo/$archivo.age" "$DESTINO/diarios/$archivo.age"
if [ "$(TZ=America/Mexico_City date +%d)" = '01' ]; then
  rclone copyto "$trabajo/$archivo.age" "$DESTINO/mensuales/$archivo.age"
fi
rclone delete --min-age 31d "$DESTINO/diarios"

echo "Listo: $archivo.age"
