import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { Boton } from '@/components/ui/Boton'
import { useSalon } from '@/features/salon/api'
import { etiquetaCuenta } from '@/features/salon/calculos'
import { formatoFecha, textoMinutos, useAhora } from '@/lib/hora'
import { llamar } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import estilos from './Dia.module.css'

const cualquiera = z.unknown()

export function Dia() {
  const salon = useSalon()
  const qc = useQueryClient()
  const ahora = useAhora(30_000)
  const idDia = useRef(crypto.randomUUID())
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['salon'] })

  const abrir = useMutation({
    mutationFn: () => llamar('abrir_dia', { p_id: idDia.current, p_fondo_centavos: 0 }, cualquiera),
    onSuccess: () => {
      idDia.current = crypto.randomUUID()
    },
    onSettled: refrescar,
  })
  const cerrar = useMutation({
    mutationFn: (diaId: string) => llamar('cerrar_dia', { p_dia_id: diaId }, cualquiera),
    onSettled: refrescar,
  })
  const error = abrir.error ?? cerrar.error

  if (salon.isPending) return <p>Cargando…</p>
  if (salon.error) return <p role="alert">No se pudo cargar el día. Revisa la conexión.</p>
  const { dia, cuentas, mesas } = salon.data
  const nombreMesa = new Map(mesas.map((m) => [m.id, m.nombre]))

  return (
    <div className={estilos.pagina}>
      <h1>Día</h1>
      {error && <p role="alert" className={estilos.error}>{error.message}</p>}

      {!dia ? (
        <section className={estilos.bloque}>
          <p className={estilos.grande}>No hay un día abierto.</p>
          <p>Ábrelo antes de atender la primera mesa. La caja sigue anotándose en la hoja.</p>
          <Boton variante="primario" grande disabled={abrir.isPending} onClick={() => abrir.mutate()}>
            {abrir.isPending ? 'Abriendo…' : 'Abrir el día'}
          </Boton>
        </section>
      ) : (
        <section className={estilos.bloque}>
          <p className={estilos.grande}>
            Día del {formatoFecha.format(new Date(`${dia.fecha_operativa}T12:00:00`))}
          </p>
          <p>Abierto hace {textoMinutos(dia.abierto_en, ahora)}.</p>
          {cuentas.length > 0 ? (
            <>
              <p>
                Para cerrar el día no debe quedar ninguna cuenta abierta. Ciérralas como cobradas fuera
                del sistema:
              </p>
              <ul className={estilos.cuentas}>
                {cuentas.map((c) => (
                  <li key={c.id}>
                    <Link to={`/cuenta/${c.id}`}>
                      {etiquetaCuenta(c, c.mesa_id ? nombreMesa.get(c.mesa_id) : undefined)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No quedan cuentas abiertas.</p>
          )}
          <Boton
            variante="primario"
            grande
            disabled={cuentas.length > 0 || cerrar.isPending}
            onClick={() => cerrar.mutate(dia.id)}
          >
            {cerrar.isPending ? 'Cerrando…' : 'Cerrar el día'}
          </Boton>
        </section>
      )}

      <section className={estilos.bloque}>
        <h2>Administración</h2>
        <ul className={estilos.enlaces}>
          <li>
            <Link to="/plano">Acomodar mesas en el plano</Link>
          </li>
          <li>
            <Link to="/menu">Ver el menú del sistema</Link>
          </li>
        </ul>
        <Boton variante="discreto" onClick={() => void supabase.auth.signOut()}>
          Salir de mi cuenta
        </Boton>
      </section>
    </div>
  )
}
