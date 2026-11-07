import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// undefined = todavía se está comprobando; null = sin sesión.
export function useSesion(): Session | null | undefined {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) =>
      setSesion(nueva),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  return sesion
}
