import { readFileSync } from 'node:fs'
import { expect, test, type Page, type Route } from '@playwright/test'

// Supabase simulado: la base real todavía no tiene las tablas de E2.
const url = /VITE_SUPABASE_URL=(\S+)/.exec(readFileSync('.env.local', 'utf8'))?.[1] ?? ''
const ref = new URL(url).hostname.split('.')[0]

const usuario = '11111111-1111-4111-8111-111111111111'
const dia = '22222222-2222-4222-8222-222222222222'
const ahora = Date.now()
const hace = (min: number) => new Date(ahora - min * 60_000).toISOString()
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const mesas = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: uuid(n),
  nombre: `Mesa ${n}`,
  x: ((n - 1) % 3) * 3,
  y: Math.floor((n - 1) / 3) * 3,
  ancho: 2,
  alto: 2,
  forma: n === 5 ? 'redonda' : 'cuadrada',
  orden: n,
}))

const lineasCuenta2 = [
  { id: uuid(201), nombre: 'Arrachera', precio_unit_centavos: 4800, cantidad: 2, modificadores: [], observacion: '', estado: 'enviada', comanda_id: uuid(301), creada_en: hace(25), cancelacion_motivo: null, ya_preparada: null },
  { id: uuid(202), nombre: 'La Náufrago', precio_unit_centavos: 16500, cantidad: 1, modificadores: [{ grupo: 'Extras', nombre: 'Tocino' }], observacion: 'sin cebolla', estado: 'enviada', comanda_id: uuid(301), creada_en: hace(25), cancelacion_motivo: null, ya_preparada: null },
  { id: uuid(203), nombre: 'Limonada ½ L', precio_unit_centavos: 5500, cantidad: 1, modificadores: [], observacion: '', estado: 'borrador', comanda_id: null, creada_en: hace(1), cancelacion_motivo: null, ya_preparada: null },
]

const cuentas = [
  { id: uuid(102), numero: 1, tipo: 'mesa', mesa_id: uuid(2), nombre: '', abierta_en: hace(25), lineas: lineasCuenta2 },
  { id: uuid(104), numero: 2, tipo: 'mesa', mesa_id: uuid(4), nombre: '', abierta_en: hace(12), lineas: [{ precio_unit_centavos: 9500, cantidad: 1, estado: 'enviada' }] },
  { id: uuid(107), numero: 3, tipo: 'llevar', mesa_id: null, nombre: 'Ana', abierta_en: hace(6), lineas: [{ precio_unit_centavos: 3800, cantidad: 3, estado: 'enviada' }] },
]

const contenido = {
  tipo: 'comanda', estacion: 'Cocina', numero: 2, cuenta: 'Mesa 4', mesero: 'Mamá', fecha: hace(1),
  orden_en_cuenta: 1, sin_conexion: false,
  lineas: [{ cantidad: 1, nombre: 'Alitas (6 piezas)', modificadores: ['BBQ'], observacion: 'salsa aparte' }],
}
const trabajos = [
  { id: uuid(401), tipo: 'comanda', estado: 'pendiente', creado_en: hace(1), impreso_en: null, intentos: 0, error: null, copia: 1, motivo: null, contenido, comandas: { cuenta_id: uuid(104) } },
]

const productos = [
  ['Hamburguesas', 1, 'La Náufrago', 15000], ['Hamburguesas', 1, 'La Isla Clásica', 14000], ['Hamburguesas', 1, 'La Palmera', 13500],
  ['Tacos', 2, 'Bistec', 3800], ['Tacos', 2, 'Arrachera', 4800], ['Alitas', 4, 'Alitas (6 piezas)', 9500],
].map(([cat, orden, nombre, precio], i) => ({
  id: uuid(500 + i), nombre, precio_centavos: precio, es_alcohol: false, visible_web: true, favorito: false,
  disponible: true, categorias: { nombre: cat, orden },
}))

const tablas: Record<string, (consulta: URLSearchParams) => unknown[]> = {
  perfiles: () => [{ id: usuario, nombre: 'Mamá', rol: 'admin', activo: true }],
  dias_operativos: () => [{ id: dia, fecha_operativa: new Date().toISOString().slice(0, 10), abierto_en: hace(180), cerrado_en: null }],
  mesas: () => mesas,
  cuentas: (q) =>
    q.get('id')
      ? [{ id: uuid(102), numero: 1, tipo: 'mesa', nombre: '', estado: 'abierta', cobrada_fuera: false, abierta_en: hace(25), mesas: { nombre: 'Mesa 2' }, lineas: lineasCuenta2,
           comandas: [{ id: uuid(301), numero: 1, enviada_en: hace(25), trabajos_impresion: [{ id: uuid(402), estado: 'impreso', creado_en: hace(25), tipo: 'comanda' }] }] }]
      : cuentas,
  trabajos_impresion: (q) => (q.get('estado')?.startsWith('eq.impreso') ? [] : trabajos),
  dispositivos: () => [{ id: uuid(900), nombre: 'Laptop de cocina', ultimo_latido: new Date().toISOString() }],
  productos: () => productos,
  modificadores: () => [],
}

async function simularSupabase(page: Page) {
  const base64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const exp = Math.floor(ahora / 1000) + 3600
  const token = `${base64({ alg: 'HS256' })}.${base64({ sub: usuario, exp, role: 'authenticated' })}.firma`
  const sesion = {
    access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id: usuario, aud: 'authenticated', role: 'authenticated', email: 'mama@example.com', app_metadata: {}, user_metadata: {}, created_at: hace(9999) },
  }
  await page.addInitScript(
    ([clave, valor]) => window.localStorage.setItem(clave!, valor!),
    [`sb-${ref}-auth-token`, JSON.stringify(sesion)],
  )
  await page.route('**/rest/v1/**', (route: Route) => {
    const peticion = new URL(route.request().url())
    const tabla = peticion.pathname.split('/').pop() ?? ''
    const filas = tablas[tabla]?.(peticion.searchParams) ?? []
    const objeto = route.request().headers()['accept']?.includes('vnd.pgrst.object')
    return route.fulfill({ json: objeto ? (filas[0] ?? null) : filas })
  })
  await page.route('**/realtime/v1/**', (route) => route.abort())
}

test('el salón muestra mesas libres, ocupadas y con ticket atrasado', async ({ page }) => {
  await simularSupabase(page)
  await page.goto('/salon')
  await expect(page.getByRole('heading', { name: 'Mesas' })).toBeVisible()
  await expect(page.getByText('2 de 6 ocupadas')).toBeVisible()
  await expect(page.getByRole('button', { name: /Mesa 1.*Libre/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Mesa 2.*Ocupada/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Para llevar Ana/ })).toBeVisible()
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true })
})

test('la cuenta separa lo enviado de lo nuevo', async ({ page }) => {
  await simularSupabase(page)
  await page.goto(`/cuenta/${uuid(102)}`)
  await expect(page.getByRole('heading', { name: 'Mesa 2' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar 1 a cocina' })).toBeEnabled()
  await page.screenshot({ path: '.impeccable/review/cuenta-mobile.png', fullPage: true })
  await page.getByRole('tab', { name: /Cuenta/ }).click()
  await expect(page.getByText('Comanda 1 ·')).toBeVisible()
  await page.screenshot({ path: '.impeccable/review/cuenta-lista-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '.impeccable/review/cuenta-desktop.png', fullPage: true })
})

test('la cocina muestra el ticket como sale en papel', async ({ page }) => {
  await simularSupabase(page)
  await page.goto('/cocina')
  await expect(page.getByText('COCINA · COMANDA 2')).toBeVisible()
  await page.screenshot({ path: '.impeccable/review/cocina-mobile.png', fullPage: true })
})
