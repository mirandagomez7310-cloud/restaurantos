import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from './supabase'

// El evento solo avisa: la verdad sale de volver a consultar.
const clavesPorTabla: Record<string, string[][]> = {
  mesas: [['salon']],
  cuentas: [['salon'], ['cuenta']],
  lineas: [['salon'], ['cuenta']],
  comandas: [['cuenta']],
  trabajos_impresion: [['trabajos'], ['cuenta']],
  dispositivos: [['dispositivos']],
}

export function useTiempoReal() {
  const qc = useQueryClient()

  useEffect(() => {
    let yaConectado = false
    const canal = supabase.channel('operacion')
    for (const [tabla, claves] of Object.entries(clavesPorTabla)) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        for (const queryKey of claves) void qc.invalidateQueries({ queryKey })
      })
    }
    canal.subscribe((estado) => {
      if (estado !== 'SUBSCRIBED') return
      // Al reconectar se pudo perder algún evento: se recarga todo.
      if (yaConectado) void qc.invalidateQueries()
      yaConectado = true
    })
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [qc])
}
