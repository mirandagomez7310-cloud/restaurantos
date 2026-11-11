import { expect, it } from 'vitest'
import { estacionCaida, etiquetaCuenta, ticketAtrasado, totalCuenta } from './calculos'

const ahora = Date.parse('2026-11-08T20:00:00Z')
const haceSegundos = (s: number) => new Date(ahora - s * 1000).toISOString()

it('el total no cuenta lo cancelado', () => {
  expect(
    totalCuenta([
      { precio_unit_centavos: 3800, cantidad: 2, estado: 'enviada' },
      { precio_unit_centavos: 15000, cantidad: 1, estado: 'cancelada' },
      { precio_unit_centavos: 5500, cantidad: 1, estado: 'borrador' },
    ]),
  ).toBe(13100)
})

it('nombra las cuentas como en el ticket', () => {
  expect(etiquetaCuenta({ tipo: 'mesa', nombre: '', numero: 3 }, 'Mesa 2')).toBe('Mesa 2')
  expect(etiquetaCuenta({ tipo: 'llevar', nombre: '', numero: 7 })).toBe('Para llevar #7')
  expect(etiquetaCuenta({ tipo: 'entrega', nombre: 'Ana', numero: 7 })).toBe('Entrega Ana')
})

it('un ticket se atrasa a los 30 s o si falló', () => {
  expect(ticketAtrasado({ estado: 'pendiente', creado_en: haceSegundos(10) }, ahora)).toBe(false)
  expect(ticketAtrasado({ estado: 'tomado', creado_en: haceSegundos(31) }, ahora)).toBe(true)
  expect(ticketAtrasado({ estado: 'impreso', creado_en: haceSegundos(300) }, ahora)).toBe(false)
  expect(ticketAtrasado({ estado: 'fallido', creado_en: haceSegundos(1) }, ahora)).toBe(true)
})

it('la estación cae a los 45 s sin latido o si nunca se conectó', () => {
  const d = (s: number) => ({ id: crypto.randomUUID(), nombre: 'Laptop', ultimo_latido: haceSegundos(s) })
  expect(estacionCaida([], ahora)).toBe(true)
  expect(estacionCaida([d(20)], ahora)).toBe(false)
  expect(estacionCaida([d(46)], ahora)).toBe(true)
})
