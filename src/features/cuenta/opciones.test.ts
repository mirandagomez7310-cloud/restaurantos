import { expect, it } from 'vitest'
import type { Modificador } from '@/features/catalogo/schemas'
import { agruparOpciones, alternar, gruposFaltantes, precioUnitario } from './opciones'

const producto = crypto.randomUUID()
const mod = (grupo: string, nombre: string, precio: number, seleccion: 'una' | 'varias'): Modificador => ({
  id: crypto.randomUUID(),
  producto_id: producto,
  grupo,
  nombre,
  precio_centavos: precio,
  seleccion,
})

const bbq = mod('Sabor', 'BBQ', 0, 'una')
const rojo = mod('Sabor', 'Red Hot', 0, 'una')
const queso = mod('Extras', 'Queso', 1500, 'varias')
const tocino = mod('Extras', 'Tocino', 1500, 'varias')
const grupos = agruparOpciones([queso, tocino, bbq, rojo])

it('pone primero los grupos obligatorios', () => {
  expect(grupos.map((g) => g.nombre)).toEqual(['Sabor', 'Extras'])
})

it('en un grupo de una opción, elegir otra reemplaza a la anterior', () => {
  const sabor = grupos[0]!
  let elegidos = alternar(sabor, new Set(), bbq.id)
  elegidos = alternar(sabor, elegidos, rojo.id)
  expect([...elegidos]).toEqual([rojo.id])
  expect(gruposFaltantes(grupos, elegidos)).toEqual([])
  expect(gruposFaltantes(grupos, new Set())).toEqual(['Sabor'])
})

it('los extras se suman al precio y se pueden quitar', () => {
  const extras = grupos[1]!
  let elegidos = alternar(extras, new Set(), queso.id)
  elegidos = alternar(extras, elegidos, tocino.id)
  expect(precioUnitario(15000, [queso, tocino], elegidos)).toBe(18000)
  elegidos = alternar(extras, elegidos, queso.id)
  expect(precioUnitario(15000, [queso, tocino], elegidos)).toBe(16500)
})
