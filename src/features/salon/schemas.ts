import { z } from 'zod'

export const mesaEsquema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  ancho: z.number().int(),
  alto: z.number().int(),
  forma: z.enum(['cuadrada', 'redonda']),
  orden: z.number().int(),
})

export const diaEsquema = z.object({
  id: z.uuid(),
  fecha_operativa: z.string(),
  abierto_en: z.string(),
  cerrado_en: z.string().nullable(),
})

export const lineaResumenEsquema = z.object({
  precio_unit_centavos: z.number().int(),
  cantidad: z.number().int(),
  estado: z.enum(['borrador', 'enviada', 'cancelada']),
})

export const cuentaResumenEsquema = z.object({
  id: z.uuid(),
  numero: z.number().int(),
  tipo: z.enum(['mesa', 'llevar', 'entrega']),
  mesa_id: z.uuid().nullable(),
  nombre: z.string(),
  abierta_en: z.string(),
  lineas: z.array(lineaResumenEsquema),
})

export const trabajoEsquema = z.object({
  id: z.uuid(),
  tipo: z.string(),
  estado: z.enum(['pendiente', 'tomado', 'impreso', 'fallido']),
  creado_en: z.string(),
  impreso_en: z.string().nullable(),
  intentos: z.number().int(),
  error: z.string().nullable(),
  copia: z.number().int(),
  motivo: z.string().nullable(),
  contenido: z.unknown(),
  comandas: z.object({ cuenta_id: z.uuid() }).nullable(),
})

export const dispositivoEsquema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  ultimo_latido: z.string(),
})

export type Mesa = z.infer<typeof mesaEsquema>
export type Dia = z.infer<typeof diaEsquema>
export type CuentaResumen = z.infer<typeof cuentaResumenEsquema>
export type Trabajo = z.infer<typeof trabajoEsquema>
export type Dispositivo = z.infer<typeof dispositivoEsquema>
