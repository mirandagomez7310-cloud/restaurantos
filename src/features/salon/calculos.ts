import { segundosDesde } from '@/lib/hora'
import type { Dispositivo, Trabajo } from './schemas'

export const SEGUNDOS_TICKET_TARDE = 30
export const SEGUNDOS_ESTACION_CAIDA = 45

type LineaConPrecio = { precio_unit_centavos: number; cantidad: number; estado: string }

export function totalCuenta(lineas: LineaConPrecio[]) {
  return lineas
    .filter((l) => l.estado !== 'cancelada')
    .reduce((suma, l) => suma + l.precio_unit_centavos * l.cantidad, 0)
}

export function etiquetaCuenta(c: { tipo: string; nombre: string; numero: number }, mesa?: string) {
  if (c.tipo === 'mesa') return mesa ?? 'Mesa'
  const tipo = c.tipo === 'llevar' ? 'Para llevar' : 'Entrega'
  return `${tipo} ${c.nombre || `#${c.numero}`}`
}

// Sin imprimir a tiempo: pendiente o tomado de más de 30 s, o ya fallido.
export function ticketAtrasado(t: Pick<Trabajo, 'estado' | 'creado_en'>, ahora: number) {
  if (t.estado === 'fallido') return true
  return t.estado !== 'impreso' && segundosDesde(t.creado_en, ahora) > SEGUNDOS_TICKET_TARDE
}

export function estacionCaida(dispositivos: Dispositivo[], ahora: number) {
  return !dispositivos.some((d) => segundosDesde(d.ultimo_latido, ahora) <= SEGUNDOS_ESTACION_CAIDA)
}
