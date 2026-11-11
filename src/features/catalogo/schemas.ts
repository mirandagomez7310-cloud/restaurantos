import { z } from 'zod'

export const productoEsquema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  precio_centavos: z.number().int(),
  es_alcohol: z.boolean(),
  visible_web: z.boolean(),
  favorito: z.boolean(),
  disponible: z.boolean(),
  categorias: z.object({ nombre: z.string(), orden: z.number().int() }),
})

export type Producto = z.infer<typeof productoEsquema>

export const modificadorEsquema = z.object({
  id: z.uuid(),
  producto_id: z.uuid(),
  grupo: z.string(),
  nombre: z.string(),
  precio_centavos: z.number().int(),
  seleccion: z.enum(['una', 'varias']),
})

export type Modificador = z.infer<typeof modificadorEsquema>
