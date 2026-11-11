import { useMutation } from '@tanstack/react-query'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { formatoPrecio } from '@/lib/dinero'
import { textoMinutos, useAhora } from '@/lib/hora'
import type { Perfil } from '@/features/perfil/usePerfil'
import { abrirCuenta, useDispositivos, usePendientes, useSalon } from './api'
import { estacionCaida, etiquetaCuenta, ticketAtrasado, totalCuenta } from './calculos'
import type { CuentaResumen, Mesa } from './schemas'
import estilos from './Salon.module.css'

export function AvisoEstacion() {
  const ahora = useAhora()
  const { data } = useDispositivos()
  if (!data || !estacionCaida(data, ahora)) return null
  return (
    <p role="alert" className={estilos.alerta}>
      La impresora de cocina no responde. Díselo a cocina y revisa la laptop.
    </p>
  )
}

export function Salon({ perfil }: { perfil: Perfil }) {
  const ahora = useAhora(15000)
  const navegar = useNavigate()
  const salon = useSalon()
  const pendientes = usePendientes()
  const [paraLlevar, setParaLlevar] = useState<'llevar' | 'entrega' | null>(null)
  const abrir = useMutation({
    mutationFn: abrirCuenta,
    onSuccess: (cuenta) => void navegar(`/cuenta/${cuenta.id}`),
  })

  if (salon.isPending) return <p className={estilos.estado}>Cargando mesas…</p>
  if (salon.error) {
    return (
      <p role="alert" className={estilos.estado}>
        No se pudieron cargar las mesas. Revisa la conexión.
      </p>
    )
  }

  const { dia, mesas, cuentas } = salon.data
  const cuentaDeMesa = new Map(cuentas.filter((c) => c.mesa_id).map((c) => [c.mesa_id, c]))
  const sueltas = cuentas.filter((c) => c.tipo !== 'mesa')
  const atrasadas = new Set(
    (pendientes.data ?? [])
      .filter((t) => ticketAtrasado(t, ahora))
      .map((t) => t.comandas?.cuenta_id),
  )
  const ocupadas = mesas.filter((m) => cuentaDeMesa.has(m.id)).length

  function tocarMesa(mesa: Mesa) {
    const cuenta = cuentaDeMesa.get(mesa.id)
    if (cuenta) void navegar(`/cuenta/${cuenta.id}`)
    else abrir.mutate({ id: crypto.randomUUID(), tipo: 'mesa', mesaId: mesa.id })
  }

  function abrirSuelta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!paraLlevar) return
    const nombre = String(new FormData(evento.currentTarget).get('nombre') ?? '')
    abrir.mutate({ id: crypto.randomUUID(), tipo: paraLlevar, nombre })
  }

  const columnas = Math.max(9, ...mesas.map((m) => m.x + m.ancho))
  const filas = Math.max(6, ...mesas.map((m) => m.y + m.alto))

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <h1>Mesas</h1>
        {dia && (
          <p>
            {ocupadas} de {mesas.length} ocupadas
          </p>
        )}
      </header>

      <AvisoEstacion />
      {abrir.error && (
        <p role="alert" className={estilos.alerta}>
          {abrir.error.message}
        </p>
      )}

      {!dia ? (
        <div className={estilos.sinDia}>
          <p>El día no está abierto.</p>
          {perfil.rol === 'admin' ? (
            <Link className={estilos.enlaceFuerte} to="/dia">
              Abrir el día
            </Link>
          ) : (
            <p>Pide a un admin que lo abra para empezar a tomar pedidos.</p>
          )}
        </div>
      ) : (
        <>
          <div
            className={estilos.plano}
            style={{ '--columnas': columnas, '--filas': filas } as CSSProperties}
          >
            {mesas.map((mesa) => (
              <MesaBoton
                key={mesa.id}
                mesa={mesa}
                cuenta={cuentaDeMesa.get(mesa.id)}
                atrasada={atrasadas.has(cuentaDeMesa.get(mesa.id)?.id)}
                ahora={ahora}
                ocupado={abrir.isPending}
                alTocar={() => tocarMesa(mesa)}
              />
            ))}
          </div>

          <section className={estilos.sueltas} aria-labelledby="sueltas">
            <div className={estilos.sueltasCabecera}>
              <h2 id="sueltas">Para llevar y entrega</h2>
              <div className={estilos.acciones}>
                <Boton onClick={() => setParaLlevar('llevar')}>Para llevar</Boton>
                <Boton onClick={() => setParaLlevar('entrega')}>Entrega</Boton>
              </div>
            </div>
            {sueltas.length === 0 ? (
              <p className={estilos.vacio}>No hay pedidos para llevar abiertos.</p>
            ) : (
              <ul className={estilos.listaSueltas}>
                {sueltas.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/cuenta/${c.id}`}
                      className={estilos.suelta}
                      data-estado={atrasadas.has(c.id) ? 'alerta' : 'ocupada'}
                    >
                      <b>{etiquetaCuenta(c)}</b>
                      <span>
                        {atrasadas.has(c.id) ? 'Ticket sin imprimir' : textoMinutos(c.abierta_en, ahora)} ·{' '}
                        {formatoPrecio(totalCuenta(c.lineas))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialogo
        abierto={paraLlevar !== null}
        alCerrar={() => setParaLlevar(null)}
        titulo={paraLlevar === 'entrega' ? 'Nueva entrega' : 'Nuevo pedido para llevar'}
      >
        <form className={estilos.forma} onSubmit={abrirSuelta}>
          <label className={estilos.campo}>
            Nombre del cliente (opcional)
            <input name="nombre" maxLength={40} autoComplete="off" />
          </label>
          <Boton type="submit" variante="primario" grande disabled={abrir.isPending}>
            {abrir.isPending ? 'Abriendo…' : 'Abrir cuenta'}
          </Boton>
        </form>
      </Dialogo>
    </div>
  )
}

function MesaBoton({
  mesa,
  cuenta,
  atrasada,
  ahora,
  ocupado,
  alTocar,
}: {
  mesa: Mesa
  cuenta: CuentaResumen | undefined
  atrasada: boolean
  ahora: number
  ocupado: boolean
  alTocar: () => void
}) {
  const estado = !cuenta ? 'libre' : atrasada ? 'alerta' : 'ocupada'
  const detalle = !cuenta
    ? 'Libre'
    : atrasada
      ? 'Ticket sin imprimir'
      : `Ocupada · ${textoMinutos(cuenta.abierta_en, ahora)}`
  return (
    <button
      type="button"
      className={estilos.mesa}
      data-estado={estado}
      data-forma={mesa.forma}
      style={
        {
          '--columna': `${mesa.x + 1} / span ${mesa.ancho}`,
          '--fila': `${mesa.y + 1} / span ${mesa.alto}`,
        } as CSSProperties
      }
      disabled={ocupado && !cuenta}
      onClick={alTocar}
    >
      <b aria-hidden="true">{mesa.nombre.replace(/^Mesa\s+/i, '')}</b>
      <span className={estilos.nombreMesa}>{mesa.nombre}</span>
      <span>{detalle}</span>
      {cuenta && <span>{formatoPrecio(totalCuenta(cuenta.lineas))}</span>}
    </button>
  )
}
