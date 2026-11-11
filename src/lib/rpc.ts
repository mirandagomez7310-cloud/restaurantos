import type { z } from 'zod'
import { supabase } from './supabase'

export const MENSAJE_SIN_CONEXION =
  'No se pudo completar. Revisa la conexión e intenta de nuevo.'

export async function llamar<T>(
  funcion: string,
  args: Record<string, unknown>,
  esquema: z.ZodType<T>,
): Promise<T> {
  const { data, error } = await supabase.rpc(funcion, args)
  // P0001: mensaje que la base de datos escribió para la pantalla.
  if (error) {
    throw new Error(error.code === 'P0001' ? error.message : MENSAJE_SIN_CONEXION)
  }
  return esquema.parse(data)
}

export function lanzarSiFalla(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}
