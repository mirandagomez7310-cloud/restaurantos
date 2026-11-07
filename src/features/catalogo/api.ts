import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { productoEsquema, type Producto } from './schemas'

export async function leerProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select(
      'id, nombre, precio_centavos, es_alcohol, visible_web, favorito, disponible, categorias(nombre, orden)',
    )
    .eq('activo', true)
    .order('nombre')
  if (error) throw new Error(error.message)
  return z.array(productoEsquema).parse(data)
}

export function agruparPorCategoria(productos: Producto[]) {
  const grupos = new Map<string, { orden: number; productos: Producto[] }>()
  for (const producto of productos) {
    const { nombre, orden } = producto.categorias
    const grupo = grupos.get(nombre) ?? { orden, productos: [] }
    grupo.productos.push(producto)
    grupos.set(nombre, grupo)
  }
  return [...grupos.entries()]
    .sort(([, a], [, b]) => a.orden - b.orden)
    .map(([nombre, grupo]) => ({ nombre, productos: grupo.productos }))
}
