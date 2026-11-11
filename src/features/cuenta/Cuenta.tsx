import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { agruparPorCategoria, leerModificadores, leerProductos } from '@/features/catalogo/api'
import type { Producto } from '@/features/catalogo/schemas'
import type { Perfil } from '@/features/perfil/usePerfil'
import { AvisoEstacion } from '@/features/salon/Salon'
import { etiquetaCuenta, ticketAtrasado, totalCuenta } from '@/features/salon/calculos'
import { formatoPrecio } from '@/lib/dinero'
import { formatoHora, useAhora } from '@/lib/hora'
import { acciones, useCuenta, type CuentaDetalle, type Linea } from './api'
import { HojaProducto } from './HojaProducto'
import estilos from './Cuenta.module.css'

export function Cuenta({ perfil }: { perfil: Perfil }) {
  const { id = '' } = useParams()
  const cuenta = useCuenta(id)

  if (cuenta.isPending) return <p>Cargando cuenta…</p>
  if (cuenta.error) return <p role="alert">No se pudo cargar la cuenta. Revisa la conexión.</p>
  if (!cuenta.data) {
    return (
      <p role="alert">
        Esa cuenta no existe. <Link to="/salon">Volver a mesas</Link>
      </p>
    )
  }
  return <CuentaAbierta cuenta={cuenta.data} perfil={perfil} />
}

function CuentaAbierta({ cuenta, perfil }: { cuenta: CuentaDetalle; perfil: Perfil }) {
  const qc = useQueryClient()
  const [vista, setVista] = useState<'pedir' | 'cuenta'>('pedir')
  const [producto, setProducto] = useState<Producto | null>(null)
  const [cerrando, setCerrando] = useState(false)
  const idEnvio = useRef(crypto.randomUUID())
  const navegar = useNavigate()
  const modificadores = useModificadores()
  const abierta = cuenta.estado === 'abierta'
  const titulo = etiquetaCuenta(cuenta, cuenta.mesas?.nombre)
  const borradores = cuenta.lineas.filter((l) => l.estado === 'borrador')
  const enviadas = cuenta.lineas.filter((l) => l.estado === 'enviada')
  const piezasNuevas = borradores.reduce((s, l) => s + l.cantidad, 0)

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['cuenta', cuenta.id] })
    void qc.invalidateQueries({ queryKey: ['salon'] })
  }

  const enviar = useMutation({
    mutationFn: acciones.enviarComanda,
    onSuccess: () => {
      idEnvio.current = crypto.randomUUID()
      setVista('cuenta')
    },
    onSettled: refrescar,
  })
  const anular = useMutation({
    mutationFn: acciones.anularVacia,
    onSuccess: () => void navegar('/salon'),
    onSettled: refrescar,
  })
  const cerrar = useMutation({
    mutationFn: acciones.cerrarFuera,
    onSuccess: () => void navegar('/salon'),
    onSettled: refrescar,
  })
  const error = enviar.error ?? anular.error ?? cerrar.error

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <Link to="/salon" className={estilos.volver}>
          Mesas
        </Link>
        <h1>{titulo}</h1>
        <p className={estilos.total}>{formatoPrecio(totalCuenta(cuenta.lineas))}</p>
      </header>

      <AvisoEstacion />
      <AvisoAtrasados cuenta={cuenta} />
      {!abierta && (
        <p role="status" className={estilos.aviso}>
          {cuenta.estado === 'anulada'
            ? 'Esta cuenta se anuló.'
            : cuenta.cobrada_fuera
              ? 'Esta cuenta se cerró como cobrada fuera del sistema.'
              : 'Esta cuenta está cerrada.'}
        </p>
      )}
      {error && <p role="alert" className={estilos.error}>{error.message}</p>}

      {abierta && (
        <div role="tablist" aria-label="Vista de la cuenta" className={estilos.pestanas}>
          <button role="tab" aria-selected={vista === 'pedir'} onClick={() => setVista('pedir')}>
            Pedir
          </button>
          <button role="tab" aria-selected={vista === 'cuenta'} onClick={() => setVista('cuenta')}>
            Cuenta{piezasNuevas > 0 && ` · ${piezasNuevas} sin enviar`}
          </button>
        </div>
      )}

      <div className={estilos.cuerpo}>
        {abierta && (
          <section className={estilos.menu} data-visible={vista === 'pedir'} aria-label="Menú">
            <Menu alElegir={setProducto} />
          </section>
        )}
        <section
          className={estilos.panel}
          data-visible={!abierta || vista === 'cuenta'}
          aria-label="Productos de la cuenta"
        >
          <ListaCuenta cuenta={cuenta} perfil={perfil} alCambiar={refrescar} />
          {abierta && (
            <div className={estilos.mas}>
              {enviadas.length === 0 ? (
                <Boton variante="discreto" disabled={anular.isPending} onClick={() => anular.mutate(cuenta.id)}>
                  Anular cuenta (se abrió por error)
                </Boton>
              ) : (
                perfil.rol === 'admin' && (
                  <Boton variante="discreto" onClick={() => setCerrando(true)}>
                    Cerrar cuenta (cobrada fuera del sistema)
                  </Boton>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {abierta && (
        <div className={estilos.barraEnviar}>
          <Boton
            variante="primario"
            grande
            disabled={piezasNuevas === 0 || enviar.isPending}
            onClick={() => enviar.mutate({ id: idEnvio.current, cuentaId: cuenta.id })}
          >
            {enviar.isPending
              ? 'Enviando…'
              : piezasNuevas === 0
                ? 'Nada nuevo que enviar'
                : `Enviar ${piezasNuevas} a cocina`}
          </Boton>
        </div>
      )}

      <HojaProducto
        cuentaId={cuenta.id}
        producto={producto}
        modificadores={modificadores}
        alCerrar={() => setProducto(null)}
      />

      <Dialogo abierto={cerrando} alCerrar={() => setCerrando(false)} titulo="¿Cerrar la cuenta?">
        <p className={estilos.texto}>
          Por ahora el cobro se anota en la hoja. Aquí solo se cierra la cuenta y se libera la mesa.
        </p>
        <Boton variante="primario" grande disabled={cerrar.isPending} onClick={() => cerrar.mutate(cuenta.id)}>
          {cerrar.isPending ? 'Cerrando…' : 'Sí, ya se cobró'}
        </Boton>
      </Dialogo>
    </div>
  )
}

function useModificadores() {
  return useQuery({ queryKey: ['modificadores'], queryFn: leerModificadores, staleTime: 300_000 }).data ?? []
}

function Menu({ alElegir }: { alElegir: (p: Producto) => void }) {
  const productos = useQuery({ queryKey: ['productos'], queryFn: leerProductos, staleTime: 300_000 })
  const [categoria, setCategoria] = useState<string | null>(null)

  if (productos.isPending) return <p>Cargando menú…</p>
  if (productos.error) return <p role="alert">No se pudo cargar el menú. Revisa la conexión.</p>
  const grupos = agruparPorCategoria(productos.data)
  if (grupos.length === 0) return <p>El menú está vacío. Pide a un admin que revise el catálogo.</p>
  const actual = grupos.find((g) => g.nombre === categoria) ?? grupos[0]!

  return (
    <>
      <div className={estilos.categorias} role="group" aria-label="Categorías">
        {grupos.map((g) => (
          <button
            key={g.nombre}
            type="button"
            className={estilos.categoria}
            aria-pressed={g.nombre === actual.nombre}
            onClick={() => setCategoria(g.nombre)}
          >
            {g.nombre}
          </button>
        ))}
      </div>
      <ul className={estilos.productos}>
        {actual.productos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={estilos.producto}
              disabled={!p.disponible}
              onClick={() => alElegir(p)}
            >
              <b>{p.nombre}</b>
              <span>{p.disponible ? formatoPrecio(p.precio_centavos) : 'Agotado'}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function AvisoAtrasados({ cuenta }: { cuenta: CuentaDetalle }) {
  const ahora = useAhora()
  const atrasadas = cuenta.comandas.filter((c) =>
    c.trabajos_impresion.some((t) => ticketAtrasado(t, ahora)),
  )
  if (atrasadas.length === 0) return null
  return (
    <p role="alert" className={estilos.alerta}>
      {atrasadas.length === 1
        ? `La comanda ${atrasadas[0]!.numero} no se ha impreso.`
        : `Las comandas ${atrasadas.map((c) => c.numero).join(', ')} no se han impreso.`}{' '}
      Avisa a cocina de viva voz.
    </p>
  )
}

function estadoImpresion(estados: string[]) {
  if (estados.length === 0) return 'Sin ticket'
  if (estados.includes('fallido')) return 'No se imprimió'
  if (estados.every((e) => e === 'impreso')) return 'Impresa'
  return 'En cola de impresión'
}

function ListaCuenta({
  cuenta,
  perfil,
  alCambiar,
}: {
  cuenta: CuentaDetalle
  perfil: Perfil
  alCambiar: () => void
}) {
  const [cancelando, setCancelando] = useState<Linea | null>(null)
  const quitar = useMutation({ mutationFn: acciones.quitarBorrador, onSettled: alCambiar })
  const abierta = cuenta.estado === 'abierta'
  const borradores = cuenta.lineas.filter((l) => l.estado === 'borrador')
  const sinComanda = cuenta.lineas.filter((l) => l.estado === 'cancelada' && !l.comanda_id)

  if (cuenta.lineas.length === 0) {
    return <p className={estilos.vacio}>Todavía no hay productos. Elige del menú para empezar.</p>
  }

  return (
    <div className={estilos.lista}>
      {quitar.error && <p role="alert" className={estilos.error}>{quitar.error.message}</p>}
      {borradores.length > 0 && (
        <div className={estilos.bloque} data-tipo="nuevo">
          <h2>Sin enviar</h2>
          <ul>
            {borradores.map((l) => (
              <FilaLinea key={l.id} linea={l}>
                {abierta && (
                  <Boton variante="discreto" disabled={quitar.isPending} onClick={() => quitar.mutate(l.id)}>
                    Quitar
                  </Boton>
                )}
              </FilaLinea>
            ))}
          </ul>
        </div>
      )}

      {[...cuenta.comandas].reverse().map((comanda) => (
        <div key={comanda.id} className={estilos.bloque}>
          <h2>
            Comanda {comanda.numero} · {formatoHora.format(new Date(comanda.enviada_en))}
            <span className={estilos.impresion}>
              {estadoImpresion(comanda.trabajos_impresion.filter((t) => t.tipo === 'comanda').map((t) => t.estado))}
            </span>
          </h2>
          <ul>
            {cuenta.lineas
              .filter((l) => l.comanda_id === comanda.id)
              .map((l) => (
                <FilaLinea key={l.id} linea={l}>
                  {abierta && l.estado === 'enviada' && perfil.rol === 'admin' && (
                    <Boton variante="discreto" onClick={() => setCancelando(l)}>
                      Cancelar
                    </Boton>
                  )}
                </FilaLinea>
              ))}
          </ul>
        </div>
      ))}

      {abierta && cuenta.comandas.length > 0 && perfil.rol !== 'admin' && (
        <p className={estilos.ayuda}>Para cancelar algo ya enviado, pide a un admin.</p>
      )}

      {sinComanda.length > 0 && (
        <details className={estilos.quitadas}>
          <summary>Quitados antes de enviar ({sinComanda.length})</summary>
          <ul>
            {sinComanda.map((l) => (
              <FilaLinea key={l.id} linea={l} />
            ))}
          </ul>
        </details>
      )}

      <DialogoCancelar linea={cancelando} alCerrar={() => setCancelando(null)} alCancelar={alCambiar} />
    </div>
  )
}

function FilaLinea({ linea, children }: { linea: Linea; children?: ReactNode }) {
  const cancelada = linea.estado === 'cancelada'
  return (
    <li className={estilos.fila} data-cancelada={cancelada}>
      <div className={estilos.filaTexto}>
        <span>
          <b>{linea.cantidad}</b> {linea.nombre}
          {cancelada && <span className={estilos.marca}> · Cancelado</span>}
        </span>
        {linea.modificadores.length > 0 && (
          <small>{linea.modificadores.map((m) => m.nombre).join(', ')}</small>
        )}
        {linea.observacion && <small>Nota: {linea.observacion}</small>}
        {cancelada && linea.comanda_id && linea.cancelacion_motivo && (
          <small>
            Motivo: {linea.cancelacion_motivo}
            {linea.ya_preparada && ' · ya estaba preparado'}
          </small>
        )}
      </div>
      <span className={estilos.importe}>{formatoPrecio(linea.precio_unit_centavos * linea.cantidad)}</span>
      {children}
    </li>
  )
}

function DialogoCancelar({
  linea,
  alCerrar,
  alCancelar,
}: {
  linea: Linea | null
  alCerrar: () => void
  alCancelar: () => void
}) {
  const cancelar = useMutation({
    mutationFn: acciones.cancelarLinea,
    onSuccess: () => {
      alCancelar()
      alCerrar()
    },
  })

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!linea) return
    const datos = new FormData(evento.currentTarget)
    cancelar.mutate({
      lineaId: linea.id,
      motivo: String(datos.get('motivo') ?? ''),
      yaPreparada: datos.get('preparada') === 'si',
    })
  }

  return (
    <Dialogo
      abierto={linea !== null}
      alCerrar={alCerrar}
      titulo={linea ? `Cancelar ${linea.cantidad} ${linea.nombre}` : ''}
    >
      <form className={estilos.hoja} onSubmit={enviar}>
        <p className={estilos.texto}>Cocina recibirá un ticket de CANCELAR.</p>
        <label className={estilos.campo}>
          Motivo
          <input name="motivo" required minLength={3} maxLength={200} autoComplete="off" />
        </label>
        <fieldset className={estilos.grupo}>
          <legend>¿Ya estaba preparado?</legend>
          <div className={estilos.opciones}>
            <label className={estilos.opcion}>
              <input type="radio" name="preparada" value="no" required defaultChecked />
              <span>No</span>
            </label>
            <label className={estilos.opcion}>
              <input type="radio" name="preparada" value="si" />
              <span>Sí, se desperdició</span>
            </label>
          </div>
        </fieldset>
        {cancelar.error && <p role="alert" className={estilos.error}>{cancelar.error.message}</p>}
        <Boton type="submit" variante="peligro" grande disabled={cancelar.isPending}>
          {cancelar.isPending ? 'Cancelando…' : 'Cancelar y avisar a cocina'}
        </Boton>
      </form>
    </Dialogo>
  )
}
