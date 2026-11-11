import { describe, expect, it } from 'vitest'
import { ANCHO_TICKET, partir, textoTicket, type ContenidoTicket } from './ticket'

const base: ContenidoTicket = {
  tipo: 'comanda',
  estacion: 'Cocina',
  numero: 12,
  cuenta: 'Mesa 4',
  mesero: 'Mamá',
  fecha: '2026-11-08T20:32:00Z', // 14:32 en Ciudad de México
  orden_en_cuenta: 1,
  lineas: [
    { cantidad: 2, nombre: 'La Náufrago', modificadores: ['Queso'], observacion: 'sin cebolla' },
  ],
}

describe('textoTicket', () => {
  it('lleva estación, número, mesa, mesero, fecha y hora local', () => {
    const t = textoTicket(base)
    expect(t[0]!.trim()).toBe('COCINA · COMANDA 12')
    expect(t[1]).toMatch(/^MESA 4 +Mesero: Mamá$/)
    expect(t[2]).toMatch(/^08\/11\/2026 +14:32$/)
    expect(t).toContain('2  La Náufrago')
    expect(t).toContain('   - Queso')
    expect(t).toContain('   * sin cebolla')
    expect(t.join('\n')).not.toMatch(/Adicional/)
  })

  it('ninguna línea pasa del ancho del papel', () => {
    const largo = 'x'.repeat(70) + ' ' + 'palabra '.repeat(20)
    const t = textoTicket({
      ...base,
      lineas: [{ cantidad: 1, nombre: largo, modificadores: [largo], observacion: largo }],
    })
    for (const linea of t) expect(linea.length).toBeLessThanOrEqual(ANCHO_TICKET)
  })

  it('marca adicional, reimpresión, cancelación y envío sin conexión', () => {
    const t = textoTicket({
      ...base,
      tipo: 'cancelacion',
      orden_en_cuenta: 2,
      copia: 2,
      motivo: 'Cambió de idea',
      sin_conexion: true,
    }).join('\n')
    expect(t).toMatch(/COCINA · CANCELAR 12/)
    expect(t).toMatch(/REIMPRESIÓN · COPIA 2/)
    expect(t).toMatch(/NO PREPARAR/)
    expect(t).toMatch(/Motivo: Cambió de idea/)
    expect(t).toMatch(/Adicional · 2\.ª comanda/)
    expect(t).toMatch(/ENVIADA SIN CONEXIÓN 14:32/)
  })
})

describe('partir', () => {
  it('no pierde texto', () => {
    const texto = 'salsa aparte y sin cebolla, bien dorada por favor'
    expect(partir(texto, '', 12).join(' ')).toBe(texto)
    expect(partir('', '   ')).toEqual([])
  })
})
