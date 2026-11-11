// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'
import { como, crearBase, crearUsuario, filas } from './db.ts'

let db: PGlite
let admin: string
let mesero: string
let estacion: string
let inactivo: string

const id = () => crypto.randomUUID()

async function rpc<T = Record<string, unknown>>(
  usuario: string | null,
  funcion: string,
  args: unknown[],
) {
  const marcas = args.map((_, i) => `$${i + 1}`).join(', ')
  return como(db, usuario, async () => {
    const r = await db.query<T>(`select * from public.${funcion}(${marcas})`, args)
    return r.rows[0] as T
  })
}

async function producto(nombre: string) {
  const [p] = await filas<{ id: string }>(
    db,
    'select id from public.productos where nombre = $1',
    [nombre],
  )
  return p!.id
}

async function mesa(nombre = 'Mesa 1') {
  const [m] = await filas<{ id: string }>(db, 'select id from public.mesas where nombre = $1', [
    nombre,
  ])
  return m!.id
}

async function modificador(productoNombre: string, nombre: string) {
  const [m] = await filas<{ id: string }>(
    db,
    `select m.id from public.modificadores m join public.productos p on p.id = m.producto_id
     where p.nombre = $1 and m.nombre = $2`,
    [productoNombre, nombre],
  )
  return m!.id
}

async function abrirDiaYCuenta() {
  await rpc(admin, 'abrir_dia', [id(), 0])
  return rpc<{ id: string }>(mesero, 'abrir_cuenta', [id(), 'mesa', await mesa(), 2, ''])
}

beforeEach(async () => {
  db = await crearBase()
  admin = await crearUsuario(db, 'Miranda', 'admin')
  mesero = await crearUsuario(db, 'Mesero', 'mesero')
  estacion = await crearUsuario(db, 'Laptop', 'estacion')
  inactivo = await crearUsuario(db, 'Nuevo', 'mesero', false)
})

describe('permisos', () => {
  it('anon no ve nada ni puede llamar funciones', async () => {
    await expect(como(db, null, () => db.query('select * from public.mesas'))).rejects.toThrow(
      /permission denied/,
    )
    await expect(rpc(null, 'abrir_dia', [id(), 0])).rejects.toThrow(/permission denied/)
  })

  it('una cuenta inactiva no ve el salón ni abre cuentas', async () => {
    const vistas = await como(db, inactivo, () => db.query('select * from public.mesas'))
    expect(vistas.rows).toHaveLength(0)
    await rpc(admin, 'abrir_dia', [id(), 0])
    await expect(rpc(inactivo, 'abrir_cuenta', [id(), 'llevar', null, null, ''])).rejects.toThrow(
      /no tiene permiso/,
    )
  })

  it('la estación no ve cuentas ni edita el catálogo, y sí lee su perfil', async () => {
    const cuentas = await como(db, estacion, () => db.query('select * from public.cuentas'))
    expect(cuentas.rows).toHaveLength(0)
    const yo = await como(db, estacion, () => db.query<{ rol: string }>('select rol from public.perfiles'))
    expect(yo.rows).toEqual([{ rol: 'estacion' }])
    const editados = await como(db, estacion, () =>
      db.query("update public.productos set precio_centavos = 1 where nombre = 'Bistec'"),
    )
    expect(editados.affectedRows).toBe(0)
  })

  it('un mesero no edita el catálogo ni el plano; un admin sí', async () => {
    const porMesero = await como(db, mesero, () =>
      db.query("update public.mesas set x = 9 where nombre = 'Mesa 1'"),
    )
    expect(porMesero.affectedRows).toBe(0)
    const porAdmin = await como(db, admin, () =>
      db.query("update public.mesas set x = 9 where nombre = 'Mesa 1'"),
    )
    expect(porAdmin.affectedRows).toBe(1)
  })

  it('nadie escribe cuentas ni líneas directo, ni siquiera un admin', async () => {
    await expect(
      como(db, admin, () => db.query('update public.cuentas set estado = $1', ['cerrada'])),
    ).rejects.toThrow(/permission denied/)
  })

  it('las funciones internas no se pueden llamar', async () => {
    await expect(rpc(admin, 'exigir', [false, 'x'])).rejects.toThrow(/permission denied/)
  })
})

describe('día operativo', () => {
  it('solo un admin abre el día, y solo uno a la vez', async () => {
    await expect(rpc(mesero, 'abrir_dia', [id(), 0])).rejects.toThrow(/Solo un admin/)
    const dia = id()
    await rpc(admin, 'abrir_dia', [dia, 0])
    // Repetir con el mismo ID no falla: es el mismo día.
    await rpc(admin, 'abrir_dia', [dia, 0])
    await expect(rpc(admin, 'abrir_dia', [id(), 0])).rejects.toThrow(/Ya hay un día abierto/)
  })

  it('no se cierra con cuentas abiertas; sí tras cerrarlas como cobradas fuera', async () => {
    const dia = id()
    await rpc(admin, 'abrir_dia', [dia, 0])
    const cuenta = await rpc<{ id: string }>(mesero, 'abrir_cuenta', [id(), 'llevar', null, null, 'Ana'])
    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Bistec'), 2, [], ''])
    await expect(rpc(admin, 'cerrar_dia', [dia])).rejects.toThrow(/Quedan cuentas abiertas/)
    await expect(rpc(admin, 'cerrar_cuenta_fuera', [cuenta.id])).rejects.toThrow(/sin enviar/)
    await rpc(mesero, 'enviar_comanda', [id(), cuenta.id])
    await expect(rpc(mesero, 'cerrar_cuenta_fuera', [cuenta.id])).rejects.toThrow(/Solo un admin/)
    const cerrada = await rpc<{ cobrada_fuera: boolean }>(admin, 'cerrar_cuenta_fuera', [cuenta.id])
    expect(cerrada.cobrada_fuera).toBe(true)
    const cerrado = await rpc<{ cerrado_en: string | null }>(admin, 'cerrar_dia', [dia])
    expect(cerrado.cerrado_en).not.toBeNull()
  })

  it('sin día abierto no se abren cuentas', async () => {
    await expect(rpc(mesero, 'abrir_cuenta', [id(), 'llevar', null, null, ''])).rejects.toThrow(
      /No hay un día abierto/,
    )
  })

  it('la numeración de comandas sigue después de medianoche', async () => {
    const dia = id()
    await rpc(admin, 'abrir_dia', [dia, 0])
    // El día abrió ayer: lo que pase hoy de madrugada sigue en el mismo día.
    await db.query(
      "update public.dias_operativos set fecha_operativa = fecha_operativa - 1, abierto_en = now() - interval '14 hours'",
    )
    const cuenta = await rpc<{ id: string; dia_id: string }>(mesero, 'abrir_cuenta', [id(), 'llevar', null, null, ''])
    expect(cuenta.dia_id).toBe(dia)
  })
})

describe('cuentas y comandas', () => {
  it('una mesa con cuenta abierta devuelve la misma cuenta', async () => {
    const primera = await abrirDiaYCuenta()
    const segunda = await rpc<{ id: string }>(admin, 'abrir_cuenta', [id(), 'mesa', await mesa(), 3, ''])
    expect(segunda.id).toBe(primera.id)
  })

  it('copia nombre y precio con extras, y exige el sabor de las alitas', async () => {
    const cuenta = await abrirDiaYCuenta()
    const alitas = await producto('Alitas (6 piezas)')
    await expect(rpc(mesero, 'agregar_linea', [id(), cuenta.id, alitas, 1, [], ''])).rejects.toThrow(
      /Elige una opción de Sabor/,
    )
    const bbq = await modificador('Alitas (6 piezas)', 'BBQ')
    const rojo = await modificador('Alitas (6 piezas)', 'Red Hot')
    await expect(
      rpc(mesero, 'agregar_linea', [id(), cuenta.id, alitas, 1, [bbq, rojo], '']),
    ).rejects.toThrow(/Elige una opción de Sabor/)
    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, alitas, 1, [bbq], 'salsa aparte'])

    const queso = await modificador('La Náufrago', 'Queso')
    const tocino = await modificador('La Náufrago', 'Tocino')
    const linea = await rpc<{ nombre: string; precio_unit_centavos: number }>(mesero, 'agregar_linea', [
      id(), cuenta.id, await producto('La Náufrago'), 2, [queso, tocino], '',
    ])
    expect(linea).toMatchObject({ nombre: 'La Náufrago', precio_unit_centavos: 15000 + 1500 + 1500 })
  })

  it('rechaza opciones de otro producto, agotados y productos sin estación', async () => {
    const cuenta = await abrirDiaYCuenta()
    const bbq = await modificador('Alitas (6 piezas)', 'BBQ')
    await expect(
      rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Bistec'), 1, [bbq], '']),
    ).rejects.toThrow(/no es válida/)
    await db.query("update public.productos set disponible = false where nombre = 'Costilla'")
    await expect(
      rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Costilla'), 1, [], '']),
    ).rejects.toThrow(/agotado/)
    await db.query("update public.productos set estacion_id = null where nombre = 'Chistorra'")
    await expect(
      rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Chistorra'), 1, [], '']),
    ).rejects.toThrow(/no tiene estación/)
  })

  it('enviar dos veces con el mismo ID no duplica, y la adicional lleva solo lo nuevo', async () => {
    const cuenta = await abrirDiaYCuenta()
    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Bistec'), 3, [], 'sin cebolla'])
    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Limonada ½ L'), 1, [], ''])
    const envio = id()
    const primera = await rpc<{ numero: number }>(mesero, 'enviar_comanda', [envio, cuenta.id])
    const repetida = await rpc<{ numero: number }>(mesero, 'enviar_comanda', [envio, cuenta.id])
    expect(repetida.numero).toBe(primera.numero)
    expect(await filas(db, 'select 1 from public.comandas')).toHaveLength(1)

    const trabajos = await filas<{ contenido: { estacion: string; lineas: { nombre: string }[] } }>(
      db,
      'select contenido from public.trabajos_impresion order by contenido ->> $1',
      ['estacion'],
    )
    expect(trabajos.map((t) => t.contenido.estacion)).toEqual(['Barra', 'Cocina'])

    await expect(rpc(mesero, 'enviar_comanda', [id(), cuenta.id])).rejects.toThrow(/nada nuevo/)

    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Papas fritas'), 1, [], ''])
    const adicional = await rpc<{ id: string; numero: number }>(mesero, 'enviar_comanda', [id(), cuenta.id])
    expect(adicional.numero).toBe(primera.numero + 1)
    const [nuevo] = await filas<{ contenido: { orden_en_cuenta: number; lineas: { nombre: string }[] } }>(
      db,
      'select contenido from public.trabajos_impresion where comanda_id = $1',
      [adicional.id],
    )
    expect(nuevo!.contenido.lineas.map((l) => l.nombre)).toEqual(['Papas fritas'])
    expect(nuevo!.contenido.orden_en_cuenta).toBe(2)
  })

  it('un mesero quita borradores, pero solo un admin cancela lo enviado y genera ticket', async () => {
    const cuenta = await abrirDiaYCuenta()
    const borrador = await rpc<{ id: string }>(mesero, 'agregar_linea', [
      id(), cuenta.id, await producto('Bistec'), 1, [], '',
    ])
    const quitada = await rpc<{ estado: string }>(mesero, 'quitar_borrador', [borrador.id])
    expect(quitada.estado).toBe('cancelada')

    const linea = await rpc<{ id: string }>(mesero, 'agregar_linea', [
      id(), cuenta.id, await producto('Costilla'), 1, [], '',
    ])
    await rpc(mesero, 'enviar_comanda', [id(), cuenta.id])
    await expect(rpc(mesero, 'quitar_borrador', [linea.id])).rejects.toThrow(/ya se envió/)
    await expect(rpc(mesero, 'cancelar_linea', [linea.id, 'se equivocó', false])).rejects.toThrow(
      /Solo un admin/,
    )
    await expect(rpc(admin, 'cancelar_linea', [linea.id, '', false])).rejects.toThrow(/motivo/)
    const cancelada = await rpc<{ estado: string; ya_preparada: boolean }>(admin, 'cancelar_linea', [
      linea.id, 'El cliente cambió de idea', true,
    ])
    expect(cancelada).toMatchObject({ estado: 'cancelada', ya_preparada: true })
    const [ticket] = await filas<{ contenido: { motivo: string } }>(
      db,
      "select contenido from public.trabajos_impresion where tipo = 'cancelacion'",
    )
    expect(ticket!.contenido.motivo).toBe('El cliente cambió de idea')
  })

  it('una cuenta cerrada no acepta productos; una vacía se anula y libera la mesa', async () => {
    const cuenta = await abrirDiaYCuenta()
    const anulada = await rpc<{ estado: string }>(mesero, 'anular_cuenta_vacia', [cuenta.id])
    expect(anulada.estado).toBe('anulada')
    await expect(
      rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Bistec'), 1, [], '']),
    ).rejects.toThrow(/ya está cerrada/)
    const nueva = await rpc<{ id: string }>(mesero, 'abrir_cuenta', [id(), 'mesa', await mesa(), 2, ''])
    expect(nueva.id).not.toBe(cuenta.id)
  })

  it('la bitácora registra quién hizo cada cambio', async () => {
    const cuenta = await abrirDiaYCuenta()
    const [registro] = await filas<{ usuario_id: string }>(
      db,
      "select usuario_id from public.bitacora where tabla = 'cuentas' and registro_id = $1",
      [cuenta.id],
    )
    expect(registro!.usuario_id).toBe(mesero)
  })
})

describe('impresión', () => {
  async function unaComanda() {
    const cuenta = await abrirDiaYCuenta()
    await rpc(mesero, 'agregar_linea', [id(), cuenta.id, await producto('Bistec'), 1, [], ''])
    await rpc(mesero, 'enviar_comanda', [id(), cuenta.id])
  }

  it('tomar_trabajo no entrega el mismo trabajo dos veces y retoma los perdidos', async () => {
    await unaComanda()
    const primero = await rpc<{ id: string } | undefined>(estacion, 'tomar_trabajo', [])
    expect(primero?.id).toBeDefined()
    const segundo = await rpc<{ id: string } | undefined>(estacion, 'tomar_trabajo', [])
    expect(segundo).toBeUndefined()
    await db.query("update public.trabajos_impresion set tomado_en = now() - interval '2 minutes'")
    const retomado = await rpc<{ id: string }>(estacion, 'tomar_trabajo', [])
    expect(retomado.id).toBe(primero!.id)
    await expect(rpc(mesero, 'tomar_trabajo', [])).rejects.toThrow(/Solo la estación/)
  })

  it('tres fallos dejan el trabajo como fallido; la reimpresión copia el contenido', async () => {
    await unaComanda()
    const trabajo = await rpc<{ id: string }>(estacion, 'tomar_trabajo', [])
    for (let i = 0; i < 3; i++) await rpc(estacion, 'confirmar_impresion', [trabajo.id, false, 'Sin papel'])
    const [fallido] = await filas<{ estado: string; intentos: number }>(
      db,
      'select estado, intentos from public.trabajos_impresion where id = $1',
      [trabajo.id],
    )
    expect(fallido).toEqual({ estado: 'fallido', intentos: 3 })

    await expect(rpc(mesero, 'reimprimir', [id(), trabajo.id, 'Sin papel'])).rejects.toThrow(/Solo un admin/)
    const copia = await rpc<{ copia: number; reimpresion_de: string; contenido: { copia: number } }>(
      admin, 'reimprimir', [id(), trabajo.id, 'Se acabó el papel'],
    )
    expect(copia).toMatchObject({ copia: 2, reimpresion_de: trabajo.id, contenido: { copia: 2 } })
    const otra = await rpc<{ copia: number }>(admin, 'reimprimir', [id(), trabajo.id, 'Otra vez'])
    expect(otra.copia).toBe(3)
  })

  it('el latido crea y actualiza el dispositivo de la estación', async () => {
    await rpc(estacion, 'latido', ['Laptop cocina', '0.1.0'])
    await rpc(estacion, 'latido', ['Laptop cocina', '0.1.1'])
    const dispositivos = await como(db, mesero, () =>
      db.query<{ version: string }>('select version from public.dispositivos'),
    )
    expect(dispositivos.rows).toEqual([{ version: '0.1.1' }])
  })
})
