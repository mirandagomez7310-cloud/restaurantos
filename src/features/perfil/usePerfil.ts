import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { lanzarSiFalla } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'

export const perfilEsquema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  rol: z.enum(['admin', 'mesero', 'estacion']),
  activo: z.boolean(),
})

export type Perfil = z.infer<typeof perfilEsquema>

async function leerPerfil(id: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, activo')
    .eq('id', id)
    .maybeSingle()
  lanzarSiFalla(error)
  return data ? perfilEsquema.parse(data) : null
}

export function usePerfil(id: string) {
  return useQuery({ queryKey: ['perfil', id], queryFn: () => leerPerfil(id) })
}
