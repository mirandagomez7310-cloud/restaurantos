export const COLUMNAS = 12
export const FILAS = 10

export type Caja = { id: string; x: number; y: number; ancho: number; alto: number }

function seTocan(a: Caja, b: Caja) {
  return a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto
}

// Dentro de la cuadrícula y sin encimarse con otra mesa.
export function posicionValida(caja: Caja, otras: Caja[]) {
  const dentro =
    caja.x >= 0 && caja.y >= 0 && caja.x + caja.ancho <= COLUMNAS && caja.y + caja.alto <= FILAS
  return dentro && !otras.some((o) => o.id !== caja.id && seTocan(caja, o))
}

export function celdaBajoPuntero(
  rect: { left: number; top: number; width: number; height: number },
  punteroX: number,
  punteroY: number,
) {
  return {
    x: Math.floor(((punteroX - rect.left) / rect.width) * COLUMNAS),
    y: Math.floor(((punteroY - rect.top) / rect.height) * FILAS),
  }
}

const flechas: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export function moverConTecla(caja: Caja, tecla: string): Caja | null {
  const paso = flechas[tecla]
  return paso ? { ...caja, x: caja.x + paso[0], y: caja.y + paso[1] } : null
}
