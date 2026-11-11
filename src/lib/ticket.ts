import { z } from 'zod'
import { formatoFecha as fechaCorta, formatoHora as hora } from './hora'

export const ANCHO_TICKET = 48 // columnas en papel de 80 mm

export const contenidoTicketEsquema = z.object({
  tipo: z.enum(['comanda', 'cancelacion']),
  estacion: z.string(),
  numero: z.number().int(),
  cuenta: z.string(),
  mesero: z.string(),
  fecha: z.string(),
  orden_en_cuenta: z.number().int().optional(),
  sin_conexion: z.boolean().optional(),
  motivo: z.string().optional(),
  copia: z.number().int().optional(),
  lineas: z.array(
    z.object({
      cantidad: z.number().int(),
      nombre: z.string(),
      modificadores: z.array(z.string()),
      observacion: z.string(),
    }),
  ),
})

export type ContenidoTicket = z.infer<typeof contenidoTicketEsquema>


function centrar(texto: string) {
  const espacio = Math.max(0, ANCHO_TICKET - texto.length)
  return ' '.repeat(Math.floor(espacio / 2)) + texto
}

function extremos(izquierda: string, derecha: string) {
  const espacio = ANCHO_TICKET - izquierda.length - derecha.length
  if (espacio >= 1) return [izquierda + ' '.repeat(espacio) + derecha]
  return [...partir(izquierda, ''), ...partir(derecha, '')]
}

// Corta en palabras sin perder texto; una palabra más larga que la línea se parte.
export function partir(texto: string, sangria: string, ancho = ANCHO_TICKET): string[] {
  const util = ancho - sangria.length
  const lineas: string[] = []
  let actual = ''
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    let resto = palabra
    while (resto.length > util) {
      if (actual) {
        lineas.push(actual)
        actual = ''
      }
      lineas.push(resto.slice(0, util))
      resto = resto.slice(util)
    }
    if (!actual) actual = resto
    else if (actual.length + 1 + resto.length <= util) actual += ' ' + resto
    else {
      lineas.push(actual)
      actual = resto
    }
  }
  if (actual) lineas.push(actual)
  return lineas.map((l) => sangria + l)
}

export function textoTicket(c: ContenidoTicket): string[] {
  const fecha = new Date(c.fecha)
  const separador = '-'.repeat(ANCHO_TICKET)
  const titulo = c.tipo === 'cancelacion' ? 'CANCELAR' : 'COMANDA'
  const salida = [centrar(`${c.estacion.toUpperCase()} · ${titulo} ${c.numero}`)]
  if (c.copia && c.copia > 1) salida.push(centrar(`*** REIMPRESIÓN · COPIA ${c.copia} ***`))
  if (c.tipo === 'cancelacion') salida.push(centrar('*** NO PREPARAR ***'))
  salida.push(
    ...extremos(c.cuenta.toUpperCase(), `Mesero: ${c.mesero}`),
    ...extremos(fechaCorta.format(fecha), hora.format(fecha)),
    separador,
  )
  for (const l of c.lineas) {
    const cantidad = String(l.cantidad).padEnd(3)
    const [primera = '', ...resto] = partir(l.nombre, '', ANCHO_TICKET - cantidad.length)
    salida.push(cantidad + primera, ...resto.map((r) => ' '.repeat(cantidad.length) + r))
    for (const m of l.modificadores) salida.push(...partir(`- ${m}`, '   '))
    if (l.observacion) salida.push(...partir(`* ${l.observacion}`, '   '))
  }
  salida.push(separador)
  if (c.tipo === 'cancelacion' && c.motivo) salida.push(...partir(`Motivo: ${c.motivo}`, ''))
  if (c.orden_en_cuenta && c.orden_en_cuenta > 1) {
    salida.push(`Adicional · ${c.orden_en_cuenta}.ª comanda de la cuenta`)
  }
  if (c.sin_conexion) {
    salida.push(...partir(`ENVIADA SIN CONEXIÓN ${hora.format(fecha)} · confirmar con cocina`, ''))
  }
  return salida
}
