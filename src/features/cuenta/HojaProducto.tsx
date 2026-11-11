import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import type { Modificador, Producto } from '@/features/catalogo/schemas'
import { formatoPrecio } from '@/lib/dinero'
import { acciones } from './api'
import { agruparOpciones, alternar, gruposFaltantes, precioUnitario } from './opciones'
import estilos from './Cuenta.module.css'

export function HojaProducto({
  cuentaId,
  producto,
  modificadores,
  alCerrar,
}: {
  cuentaId: string
  producto: Producto | null
  modificadores: Modificador[]
  alCerrar: () => void
}) {
  return (
    <Dialogo abierto={producto !== null} alCerrar={alCerrar} titulo={producto?.nombre ?? ''}>
      {producto && (
        <Formulario
          key={producto.id}
          cuentaId={cuentaId}
          producto={producto}
          modificadores={modificadores.filter((m) => m.producto_id === producto.id)}
          alTerminar={alCerrar}
        />
      )}
    </Dialogo>
  )
}

function Formulario({
  cuentaId,
  producto,
  modificadores,
  alTerminar,
}: {
  cuentaId: string
  producto: Producto
  modificadores: Modificador[]
  alTerminar: () => void
}) {
  const qc = useQueryClient()
  const [cantidad, setCantidad] = useState(1)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [observacion, setObservacion] = useState('')
  // Un ID por intento: si se reintenta tras un corte, no se duplica la línea.
  const idLinea = useRef(crypto.randomUUID())
  const grupos = agruparOpciones(modificadores)
  const faltan = gruposFaltantes(grupos, elegidos)
  const precio = precioUnitario(producto.precio_centavos, modificadores, elegidos)

  const agregar = useMutation({
    mutationFn: acciones.agregarLinea,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cuenta', cuentaId] })
      void qc.invalidateQueries({ queryKey: ['salon'] })
      alTerminar()
    },
  })

  return (
    <form
      className={estilos.hoja}
      onSubmit={(e) => {
        e.preventDefault()
        if (faltan.length > 0) return
        agregar.mutate({
          id: idLinea.current,
          cuentaId,
          productoId: producto.id,
          cantidad,
          modificadorIds: [...elegidos],
          observacion,
        })
      }}
    >
      {grupos.map((grupo) => (
        <fieldset key={grupo.nombre} className={estilos.grupo}>
          <legend>
            {grupo.nombre}
            <span>{grupo.seleccion === 'una' ? ' · elige uno' : ' · opcional'}</span>
          </legend>
          <div className={estilos.opciones}>
            {grupo.opciones.map((o) => (
              <label key={o.id} className={estilos.opcion}>
                <input
                  type={grupo.seleccion === 'una' ? 'radio' : 'checkbox'}
                  name={grupo.nombre}
                  checked={elegidos.has(o.id)}
                  onChange={() => setElegidos(alternar(grupo, elegidos, o.id))}
                />
                <span>
                  {o.nombre}
                  {o.precio_centavos > 0 && ` +${formatoPrecio(o.precio_centavos)}`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className={estilos.cantidad}>
        <span id="cantidad">Cantidad</span>
        <div role="group" aria-labelledby="cantidad" className={estilos.pasos}>
          <Boton aria-label="Uno menos" disabled={cantidad <= 1} onClick={() => setCantidad(cantidad - 1)}>
            −
          </Boton>
          <output aria-live="polite">{cantidad}</output>
          <Boton aria-label="Uno más" disabled={cantidad >= 99} onClick={() => setCantidad(cantidad + 1)}>
            +
          </Boton>
        </div>
      </div>

      <label className={estilos.campo}>
        Nota para cocina (opcional)
        <textarea
          rows={2}
          maxLength={200}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Sin cebolla, salsa aparte…"
        />
      </label>

      {agregar.error && <p role="alert" className={estilos.error}>{agregar.error.message}</p>}
      {faltan.length > 0 && <p className={estilos.ayuda}>Falta elegir: {faltan.join(', ')}.</p>}

      <Boton type="submit" variante="primario" grande disabled={faltan.length > 0 || agregar.isPending}>
        {agregar.isPending ? 'Agregando…' : `Agregar ${cantidad} · ${formatoPrecio(precio * cantidad)}`}
      </Boton>
    </form>
  )
}
