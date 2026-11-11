import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { lanzarSiFalla, llamar } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'

const lineaEsquema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  precio_unit_centavos: z.number().int(),
  cantidad: z.number().int(),
  modificadores: z.array(z.object({ grupo: z.string(), nombre: z.string() })),
  observacion: z.string(),
  estado: z.enum(['borrador', 'enviada', 'cancelada']),
  comanda_id: z.uuid().nullable(),
  creada_en: z.string(),
  cancelacion_motivo: z.string().nullable(),
  ya_preparada: z.boolean().nullable(),
})

const cuentaEsquema = z.object({
  id: z.uuid(),
  numero: z.number().int(),
  tipo: z.enum(['mesa', 'llevar', 'entrega']),
  nombre: z.string(),
  estado: z.enum(['abierta', 'cerrada', 'anulada']),
  cobrada_fuera: z.boolean(),
  abierta_en: z.string(),
  mesas: z.object({ nombre: z.string() }).nullable(),
  lineas: z.array(lineaEsquema),
  comandas: z.array(
    z.object({
      id: z.uuid(),
      numero: z.number().int(),
      enviada_en: z.string(),
      trabajos_impresion: z.array(
        z.object({
          id: z.uuid(),
          estado: z.enum(['pendiente', 'tomado', 'impreso', 'fallido']),
          creado_en: z.string(),
          tipo: z.string(),
        }),
      ),
    }),
  ),
})

export type Linea = z.infer<typeof lineaEsquema>
export type CuentaDetalle = z.infer<typeof cuentaEsquema>

async function leerCuenta(id: string) {
  const { data, error } = await supabase
    .from('cuentas')
    .select(
      `id, numero, tipo, nombre, estado, cobrada_fuera, abierta_en, mesas(nombre),
       lineas(id, nombre, precio_unit_centavos, cantidad, modificadores, observacion, estado,
              comanda_id, creada_en, cancelacion_motivo, ya_preparada),
       comandas(id, numero, enviada_en, trabajos_impresion(id, estado, creado_en, tipo))`,
    )
    .eq('id', id)
    .maybeSingle()
  lanzarSiFalla(error)
  if (!data) return null
  const cuenta = cuentaEsquema.parse(data)
  cuenta.lineas.sort((a, b) => a.creada_en.localeCompare(b.creada_en))
  cuenta.comandas.sort((a, b) => a.numero - b.numero)
  return cuenta
}

export function useCuenta(id: string) {
  return useQuery({ queryKey: ['cuenta', id], queryFn: () => leerCuenta(id) })
}

const cualquiera = z.unknown()

export const acciones = {
  agregarLinea: (a: {
    id: string
    cuentaId: string
    productoId: string
    cantidad: number
    modificadorIds: string[]
    observacion: string
  }) =>
    llamar(
      'agregar_linea',
      {
        p_id: a.id,
        p_cuenta_id: a.cuentaId,
        p_producto_id: a.productoId,
        p_cantidad: a.cantidad,
        p_modificador_ids: a.modificadorIds,
        p_observacion: a.observacion,
      },
      cualquiera,
    ),
  quitarBorrador: (lineaId: string) => llamar('quitar_borrador', { p_linea_id: lineaId }, cualquiera),
  enviarComanda: (a: { id: string; cuentaId: string }) =>
    llamar('enviar_comanda', { p_id: a.id, p_cuenta_id: a.cuentaId }, z.object({ numero: z.number() })),
  cancelarLinea: (a: { lineaId: string; motivo: string; yaPreparada: boolean }) =>
    llamar(
      'cancelar_linea',
      { p_linea_id: a.lineaId, p_motivo: a.motivo, p_ya_preparada: a.yaPreparada },
      cualquiera,
    ),
  anularVacia: (cuentaId: string) => llamar('anular_cuenta_vacia', { p_cuenta_id: cuentaId }, cualquiera),
  cerrarFuera: (cuentaId: string) => llamar('cerrar_cuenta_fuera', { p_cuenta_id: cuentaId }, cualquiera),
}
