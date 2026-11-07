import { describe, expect, it } from 'vitest'
import { leerEnv } from './env'

describe('leerEnv', () => {
  it('acepta las variables completas', () => {
    const env = leerEnv({
      VITE_SUPABASE_URL: 'https://ejemplo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'clave',
    })
    expect(env.VITE_SUPABASE_URL).toBe('https://ejemplo.supabase.co')
  })

  it('rechaza una configuración incompleta', () => {
    expect(() => leerEnv({ VITE_SUPABASE_URL: 'no-es-url' })).toThrow()
  })
})
