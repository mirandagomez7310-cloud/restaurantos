import { z } from 'zod'

const esquema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

export type Env = z.infer<typeof esquema>

export function leerEnv(valores: Record<string, unknown>): Env {
  return esquema.parse(valores)
}
