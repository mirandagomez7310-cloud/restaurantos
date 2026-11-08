# Respaldos: cómo funcionan y cómo restaurar

## Qué se respalda

Todos los días a las 4:00 (hora de Ciudad de México), el workflow `Respaldo` de GitHub Actions:

1. Copia los esquemas `public` (todos los datos del negocio) y `auth` (las cuentas) con `pg_dump` 17.
2. Restaura la copia en un Postgres temporal y comprueba que cada tabla tenga las mismas filas. Si no coinciden, falla y GitHub avisa por correo.
3. Cifra la copia con `age` usando `respaldo/llave-publica.txt`.
4. La sube a Google Drive, a la carpeta **Respaldos La Isla**:
   - `diarios/`: los últimos 31 días.
   - `mensuales/`: la copia del día 1 de cada mes, sin borrar.

**No se respalda:** la configuración del panel de Supabase (acceso, URL del sitio, llaves). Si se recrea el proyecto, se configura a mano: registro público apagado, migraciones de `supabase/migrations`, y los datos con este procedimiento.

## Piezas y dónde están

| Pieza                                                                   | Dónde                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Usuario de base de datos `respaldo` (solo lectura, salta RLS)           | Supabase                                                                                       |
| `RESPALDO_DB_URL` (conexión por el pooler de sesión, IPv4)              | Secreto de GitHub                                                                              |
| `RCLONE_CONFIG` (permiso `drive.file`: solo ve lo que el respaldo crea) | Secreto de GitHub                                                                              |
| Llave pública                                                           | `respaldo/llave-publica.txt`                                                                   |
| **Llave privada**                                                       | Solo con Miranda, en su gestor de contraseñas. **Sin ella, los respaldos no se pueden abrir.** |

## Lanzar un respaldo a mano

Antes de cada migración: en GitHub → **Actions** → **Respaldo** → **Run workflow**. O desde la terminal:

```sh
gh workflow run Respaldo
```

## Abrir un respaldo

1. Descarga `age` para Windows desde <https://github.com/FiloSottile/age/releases> (archivo `age-v…-windows-amd64.zip`) y descomprímelo.
2. Descarga el archivo `.age` desde Drive.
3. Guarda la llave privada en un archivo temporal, por ejemplo `llave.txt`. La línea que importa empieza con `AGE-SECRET-KEY-`.
4. Descifra:

   ```sh
   age --decrypt --identity llave.txt --output la-isla.dump la-isla-AAAA-MM-DD.dump.age
   ```

5. Borra `llave.txt`.

`la-isla.dump` es un archivo en el formato de `pg_dump`; para ver lo que contiene: `pg_restore --list la-isla.dump`.

## Restaurar en Supabase

Solo si se perdieron datos. **Hacerlo fuera del horario de servicio.**

1. Lanza un respaldo a mano del estado actual, por si hay que volver atrás.
2. En el panel de Supabase, copia la cadena de conexión **Session pooler** del usuario `postgres`.
3. Restaura solo los datos del negocio (las cuentas de `auth` solo si se perdieron):

   ```sh
   pg_restore --no-owner --no-privileges --clean --if-exists --schema=public \
     --dbname "CADENA_DE_CONEXIÓN" la-isla.dump
   ```

4. Entra a la app y comprueba el catálogo y el último día capturado.

## Si el workflow falla

- **Error de conexión o contraseña:** revisa que el proyecto de Supabase no esté pausado y que exista el usuario `respaldo`.
- **Error de Drive (`invalid_grant`):** el permiso de Drive caducó o se revocó. Vuelve a ejecutar `rclone config create drive drive scope=drive.file` y actualiza el secreto `RCLONE_CONFIG`.
- **Filas distintas:** se escribió algo durante el respaldo, o la restauración perdió datos. Lanza otro respaldo; si se repite, revisa el registro del workflow.
