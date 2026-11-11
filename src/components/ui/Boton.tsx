import type { ButtonHTMLAttributes } from 'react'
import estilos from './Boton.module.css'

type Variante = 'normal' | 'primario' | 'acento' | 'peligro' | 'discreto'

export function Boton({
  variante = 'normal',
  grande = false,
  className,
  type = 'button',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  return (
    <button
      type={type}
      className={[estilos.boton, estilos[variante], grande && estilos.grande, className]
        .filter(Boolean)
        .join(' ')}
      {...resto}
    />
  )
}
