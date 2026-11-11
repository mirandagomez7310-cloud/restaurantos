import { useEffect, useState } from 'react'

export const ZONA = 'America/Mexico_City'

export const formatoHora = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function segundosDesde(iso: string, ahora: number) {
  return Math.max(0, Math.floor((ahora - Date.parse(iso)) / 1000))
}

export function textoMinutos(iso: string, ahora: number) {
  const minutos = Math.floor(segundosDesde(iso, ahora) / 60)
  if (minutos < 60) return `${minutos} min`
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`
}

// Reloj de pantalla para avisos por tiempo (cuenta abierta, ticket sin imprimir).
export function useAhora(cadaMs = 5000) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), cadaMs)
    return () => clearInterval(t)
  }, [cadaMs])
  return ahora
}
