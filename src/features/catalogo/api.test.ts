import { expect, it, vi } from 'vitest'
import { agruparPorCategoria } from './api'
import type { Producto } from './schemas'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const producto = (
  nombre: string,
  categoria: string,
  orden: number,
): Producto => ({
  id: crypto.randomUUID(),
  nombre,
  precio_centavos: 100,
  es_alcohol: false,
  visible_web: true,
  favorito: false,
  disponible: true,
  categorias: { nombre: categoria, orden },
})

it('agrupa en el orden del menú', () => {
  const grupos = agruparPorCategoria([
    producto('Bistec', 'Tacos', 2),
    producto('La Palmera', 'Hamburguesas', 1),
    producto('Barriga', 'Tacos', 2),
  ])
  expect(grupos.map((g) => g.nombre)).toEqual(['Hamburguesas', 'Tacos'])
  expect(grupos[1]?.productos).toHaveLength(2)
})
