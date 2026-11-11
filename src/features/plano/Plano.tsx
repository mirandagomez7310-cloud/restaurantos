import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { useSalon } from '@/features/salon/api'
import type { Mesa } from '@/features/salon/schemas'
import { lanzarSiFalla } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import { celdaBajoPuntero, COLUMNAS, FILAS, moverConTecla, posicionValida, type Caja } from './cuadricula'
import estilos from './Plano.module.css'

async function guardarPosicion(caja: Caja) {
  const { error } = await supabase.from('mesas').update({ x: caja.x, y: caja.y }).eq('id', caja.id)
  lanzarSiFalla(error)
}

export function Plano() {
  const salon = useSalon()
  const qc = useQueryClient()
  const lienzo = useRef<HTMLDivElement>(null)
  const [arrastre, setArrastre] = useState<{ caja: Caja; agarreX: number; agarreY: number } | null>(null)
  const [aviso, setAviso] = useState('')
  const guardar = useMutation({
    mutationFn: guardarPosicion,
    onError: () => setAviso('No se pudo guardar el cambio. Revisa la conexión.'),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['salon'] }),
  })

  if (salon.isPending) return <p>Cargando plano…</p>
  if (salon.error) return <p role="alert">No se pudo cargar el plano. Revisa la conexión.</p>
  const mesas = salon.data.mesas

  function intentar(caja: Caja) {
    if (!posicionValida(caja, mesas)) {
      setAviso('Ahí no cabe: se encima con otra mesa o se sale del plano.')
      return
    }
    setAviso('')
    guardar.mutate(caja)
  }

  function alBajar(e: PointerEvent<HTMLButtonElement>, mesa: Mesa) {
    if (!lienzo.current) return
    const celda = celdaBajoPuntero(lienzo.current.getBoundingClientRect(), e.clientX, e.clientY)
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastre({ caja: mesa, agarreX: celda.x - mesa.x, agarreY: celda.y - mesa.y })
  }

  function alMover(e: PointerEvent<HTMLButtonElement>) {
    if (!arrastre || !lienzo.current) return
    const celda = celdaBajoPuntero(lienzo.current.getBoundingClientRect(), e.clientX, e.clientY)
    const x = celda.x - arrastre.agarreX
    const y = celda.y - arrastre.agarreY
    if (x !== arrastre.caja.x || y !== arrastre.caja.y) {
      setArrastre({ ...arrastre, caja: { ...arrastre.caja, x, y } })
    }
  }

  function alSoltar(mesa: Mesa) {
    if (!arrastre) return
    const { caja } = arrastre
    setArrastre(null)
    if (caja.x !== mesa.x || caja.y !== mesa.y) intentar(caja)
  }

  function alTecla(e: KeyboardEvent<HTMLButtonElement>, mesa: Mesa) {
    const movida = moverConTecla(mesa, e.key)
    if (!movida) return
    e.preventDefault()
    intentar(movida)
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <h1>Plano del salón</h1>
        <Link to="/dia">Volver</Link>
      </header>
      <p className={estilos.ayuda}>
        Arrastra cada mesa a su lugar. Con el teclado: selecciona una mesa y usa las flechas. Se guarda solo.
      </p>
      <p role="status" className={aviso ? estilos.aviso : estilos.oculto}>
        {aviso || (guardar.isPending ? 'Guardando…' : '')}
      </p>
      <div
        ref={lienzo}
        className={estilos.lienzo}
        style={{ '--columnas': COLUMNAS, '--filas': FILAS } as CSSProperties}
      >
        {mesas.map((mesa) => {
          const caja = arrastre?.caja.id === mesa.id ? arrastre.caja : mesa
          const valida = posicionValida(caja, mesas)
          return (
            <button
              key={mesa.id}
              type="button"
              className={estilos.mesa}
              data-arrastrando={arrastre?.caja.id === mesa.id}
              data-invalida={!valida}
              aria-label={`${mesa.nombre}, columna ${caja.x + 1}, fila ${caja.y + 1}. Usa las flechas para moverla.`}
              style={{
                gridColumn: `${caja.x + 1} / span ${caja.ancho}`,
                gridRow: `${caja.y + 1} / span ${caja.alto}`,
              }}
              onPointerDown={(e) => alBajar(e, mesa)}
              onPointerMove={alMover}
              onPointerUp={() => alSoltar(mesa)}
              onPointerCancel={() => setArrastre(null)}
              onKeyDown={(e) => alTecla(e, mesa)}
            >
              {mesa.nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
