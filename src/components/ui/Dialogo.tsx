import { useEffect, useId, useRef, type ReactNode } from 'react'
import estilos from './Dialogo.module.css'

// <dialog> nativo: atrapa el foco, cierra con Esc y en el celular sale desde abajo.
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  children,
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) {
      if (typeof dialogo.showModal === 'function') dialogo.showModal()
      else dialogo.setAttribute('open', '')
    }
    if (!abierto && dialogo.open) {
      if (typeof dialogo.close === 'function') dialogo.close()
      else dialogo.removeAttribute('open')
    }
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className={estilos.dialogo}
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar()
      }}
    >
      {abierto && (
        <div className={estilos.contenido}>
          <div className={estilos.cabecera}>
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className={estilos.cerrar} onClick={alCerrar}>
              Cerrar
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
