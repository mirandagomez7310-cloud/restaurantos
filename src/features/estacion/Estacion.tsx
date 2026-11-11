import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { z } from 'zod'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import type { Perfil } from '@/features/perfil/usePerfil'
import { useImpresos, usePendientes } from '@/features/salon/api'
import type { Trabajo } from '@/features/salon/schemas'
import { formatoHora } from '@/lib/hora'
import { llamar } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import { contenidoTicketEsquema, textoTicket } from '@/lib/ticket'
import estilos from './Estacion.module.css'

const LATIDO_MS = 15_000
const VERSION = '0.2.0'
const cualquiera = z.unknown()

function useLatido(activo: boolean) {
  const [falla, setFalla] = useState(false)
  useEffect(() => {
    if (!activo) return
    const enviar = () =>
      llamar('latido', { p_nombre: 'Laptop de cocina', p_version: VERSION }, cualquiera).then(
        () => setFalla(false),
        () => setFalla(true),
      )
    void enviar()
    const t = setInterval(() => void enviar(), LATIDO_MS)
    return () => clearInterval(t)
  }, [activo])
  return falla
}

// La cuenta de estación imprime y confirma; el equipo solo ve la cola, y un admin reimprime.
export function Estacion({ perfil }: { perfil: Perfil }) {
  const esEstacion = perfil.rol === 'estacion'
  const sinLatido = useLatido(esEstacion)
  const pendientes = usePendientes()
  const impresos = useImpresos()
  const qc = useQueryClient()
  const [imprimiendo, setImprimiendo] = useState<string | null>(null)
  const [reimprimir, setReimprimir] = useState<Trabajo | null>(null)
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['trabajos'] })

  const confirmar = useMutation({
    mutationFn: (id: string) =>
      llamar('confirmar_impresion', { p_trabajo_id: id, p_ok: true, p_error: null }, cualquiera),
    onSettled: refrescar,
  })

  // Imprime solo el ticket elegido: la hoja de estilos de impresión oculta lo demás.
  useEffect(() => {
    if (!imprimiendo) return
    const t = requestAnimationFrame(() => {
      window.print()
      setImprimiendo(null)
    })
    return () => cancelAnimationFrame(t)
  }, [imprimiendo])

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <h1>Cocina · comandas</h1>
        {esEstacion && (
          <Boton variante="discreto" onClick={() => void supabase.auth.signOut()}>
            Salir
          </Boton>
        )}
      </header>

      {sinLatido && (
        <p role="alert" className={estilos.alerta}>
          Esta laptop perdió la conexión. Revisa el internet: los meseros ven la impresora como caída.
        </p>
      )}
      {confirmar.error && <p role="alert" className={estilos.alerta}>{confirmar.error.message}</p>}
      {!esEstacion && (
        <p className={estilos.nota}>
          Vista del equipo. Los tickets los imprime la laptop de cocina con su propia cuenta.
        </p>
      )}

      <section aria-labelledby="pendientes">
        <h2 id="pendientes">
          Por imprimir {pendientes.data && `(${pendientes.data.length})`}
        </h2>
        {pendientes.isPending ? (
          <p>Cargando…</p>
        ) : pendientes.error ? (
          <p role="alert">No se pudo cargar la cola. Revisa la conexión.</p>
        ) : pendientes.data.length === 0 ? (
          <p className={estilos.vacio}>No hay comandas pendientes.</p>
        ) : (
          <ul className={estilos.tickets}>
            {pendientes.data.map((t) => (
              <TicketTarjeta key={t.id} trabajo={t} imprimiendo={imprimiendo === t.id}>
                {esEstacion && (
                  <>
                    <Boton variante="primario" onClick={() => setImprimiendo(t.id)}>
                      Imprimir
                    </Boton>
                    <Boton disabled={confirmar.isPending} onClick={() => confirmar.mutate(t.id)}>
                      Ya salió: marcar impreso
                    </Boton>
                  </>
                )}
                {perfil.rol === 'admin' && t.estado === 'fallido' && (
                  <Boton onClick={() => setReimprimir(t)}>Reimprimir</Boton>
                )}
              </TicketTarjeta>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="impresos">
        <h2 id="impresos">Impresos hace poco</h2>
        {impresos.data && impresos.data.length > 0 ? (
          <ul className={estilos.tickets}>
            {impresos.data.map((t) => (
              <TicketTarjeta key={t.id} trabajo={t} imprimiendo={false} compacto>
                {perfil.rol === 'admin' && <Boton onClick={() => setReimprimir(t)}>Reimprimir</Boton>}
              </TicketTarjeta>
            ))}
          </ul>
        ) : (
          <p className={estilos.vacio}>Aún no se imprime nada hoy.</p>
        )}
      </section>

      <DialogoReimprimir trabajo={reimprimir} alCerrar={() => setReimprimir(null)} alTerminar={refrescar} />
    </div>
  )
}

function TicketTarjeta({
  trabajo,
  imprimiendo,
  compacto = false,
  children,
}: {
  trabajo: Trabajo
  imprimiendo: boolean
  compacto?: boolean
  children?: ReactNode
}) {
  const contenido = contenidoTicketEsquema.safeParse(trabajo.contenido)
  const estado =
    trabajo.estado === 'fallido'
      ? `No se pudo imprimir (${trabajo.error ?? 'error'})`
      : trabajo.estado === 'impreso'
        ? `Impreso ${trabajo.impreso_en ? formatoHora.format(new Date(trabajo.impreso_en)) : ''}`
        : `En cola desde ${formatoHora.format(new Date(trabajo.creado_en))}`
  return (
    <li className={estilos.tarjeta} data-imprimiendo={imprimiendo} data-estado={trabajo.estado}>
      <p className={estilos.estado}>{estado}</p>
      {contenido.success ? (
        <pre className={estilos.ticket} data-compacto={compacto}>
          {textoTicket(contenido.data).join('\n')}
        </pre>
      ) : (
        <p role="alert">Este ticket tiene un formato que la pantalla no reconoce.</p>
      )}
      {children && <div className={estilos.acciones}>{children}</div>}
    </li>
  )
}

function DialogoReimprimir({
  trabajo,
  alCerrar,
  alTerminar,
}: {
  trabajo: Trabajo | null
  alCerrar: () => void
  alTerminar: () => void
}) {
  // Un ID por copia pedida: un doble toque no saca dos copias.
  const idCopia = useRef(crypto.randomUUID())
  const reimprimir = useMutation({
    mutationFn: (a: { trabajoId: string; motivo: string }) =>
      llamar('reimprimir', { p_id: idCopia.current, p_trabajo_id: a.trabajoId, p_motivo: a.motivo }, cualquiera),
    onSuccess: () => {
      idCopia.current = crypto.randomUUID()
      alTerminar()
      alCerrar()
    },
  })

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!trabajo) return
    reimprimir.mutate({
      trabajoId: trabajo.id,
      motivo: String(new FormData(evento.currentTarget).get('motivo') ?? ''),
    })
  }

  return (
    <Dialogo abierto={trabajo !== null} alCerrar={alCerrar} titulo="Reimprimir ticket">
      <form className={estilos.forma} onSubmit={enviar}>
        <p>La copia sale marcada como REIMPRESIÓN para que no se prepare dos veces.</p>
        <label className={estilos.campo}>
          Motivo
          <input name="motivo" required minLength={3} maxLength={200} autoComplete="off" />
        </label>
        {reimprimir.error && <p role="alert" className={estilos.alerta}>{reimprimir.error.message}</p>}
        <Boton type="submit" variante="primario" grande disabled={reimprimir.isPending}>
          {reimprimir.isPending ? 'Enviando…' : 'Reimprimir'}
        </Boton>
      </form>
    </Dialogo>
  )
}
