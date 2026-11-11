import type { Modificador } from '@/features/catalogo/schemas'

export type Grupo = { nombre: string; seleccion: 'una' | 'varias'; opciones: Modificador[] }

export function agruparOpciones(modificadores: Modificador[]): Grupo[] {
  const grupos = new Map<string, Grupo>()
  for (const m of modificadores) {
    const grupo = grupos.get(m.grupo) ?? { nombre: m.grupo, seleccion: m.seleccion, opciones: [] }
    if (m.seleccion === 'una') grupo.seleccion = 'una'
    grupo.opciones.push(m)
    grupos.set(m.grupo, grupo)
  }
  // Lo obligatorio primero: es lo que cocina necesita saber.
  return [...grupos.values()].sort(
    (a, b) => Number(b.seleccion === 'una') - Number(a.seleccion === 'una'),
  )
}

// Misma regla que agregar_linea en la base de datos: una opción exacta por grupo obligatorio.
export function gruposFaltantes(grupos: Grupo[], elegidos: Set<string>) {
  return grupos
    .filter((g) => g.seleccion === 'una')
    .filter((g) => g.opciones.filter((o) => elegidos.has(o.id)).length !== 1)
    .map((g) => g.nombre)
}

export function precioUnitario(base: number, modificadores: Modificador[], elegidos: Set<string>) {
  return modificadores
    .filter((m) => elegidos.has(m.id))
    .reduce((suma, m) => suma + m.precio_centavos, base)
}

export function alternar(grupo: Grupo, elegidos: Set<string>, id: string) {
  const siguiente = new Set(elegidos)
  if (grupo.seleccion === 'una') {
    for (const o of grupo.opciones) siguiente.delete(o.id)
    siguiente.add(id)
  } else if (siguiente.has(id)) siguiente.delete(id)
  else siguiente.add(id)
  return siguiente
}
