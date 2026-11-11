import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Modificador, Producto } from '@/features/catalogo/schemas'
import type { Perfil } from '@/features/perfil/usePerfil'
import type { CuentaDetalle } from './api'

const llamar = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/rpc', () => ({ llamar: (...a: unknown[]) => llamar(...a), lanzarSiFalla: () => undefined }))

const alitas: Producto = {
  id: crypto.randomUUID(),
  nombre: 'Alitas (6 piezas)',
  precio_centavos: 9500,
  es_alcohol: false,
  visible_web: true,
  favorito: true,
  disponible: true,
  categorias: { nombre: 'Alitas', orden: 4 },
}
const sabor = (nombre: string): Modificador => ({
  id: crypto.randomUUID(),
  producto_id: alitas.id,
  grupo: 'Sabor',
  nombre,
  precio_centavos: 0,
  seleccion: 'una',
})
const bbq = sabor('BBQ')

vi.mock('@/features/catalogo/api', () => ({
  leerProductos: () => Promise.resolve([alitas]),
  leerModificadores: () => Promise.resolve([bbq, sabor('Red Hot')]),
  agruparPorCategoria: (p: Producto[]) => [{ nombre: 'Alitas', productos: p }],
}))
vi.mock('@/features/salon/api', () => ({ useDispositivos: () => ({ data: undefined }) }))

let cuenta: CuentaDetalle
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  useCuenta: () => ({ isPending: false, error: null, data: cuenta }),
}))

const { Cuenta } = await import('./Cuenta')

const comanda = crypto.randomUUID()
function cuentaCon(lineas: Partial<CuentaDetalle['lineas'][number]>[]): CuentaDetalle {
  return {
    id: crypto.randomUUID(),
    numero: 1,
    tipo: 'mesa',
    nombre: '',
    estado: 'abierta',
    cobrada_fuera: false,
    abierta_en: new Date().toISOString(),
    mesas: { nombre: 'Mesa 4' },
    comandas: [{ id: comanda, numero: 12, enviada_en: new Date().toISOString(), trabajos_impresion: [] }],
    lineas: lineas.map((l) => ({
      id: crypto.randomUUID(),
      nombre: 'Bistec',
      precio_unit_centavos: 3800,
      cantidad: 1,
      modificadores: [],
      observacion: '',
      estado: 'enviada',
      comanda_id: comanda,
      creada_en: new Date().toISOString(),
      cancelacion_motivo: null,
      ya_preparada: null,
      ...l,
    })),
  }
}

const perfil = (rol: Perfil['rol']): Perfil => ({ id: crypto.randomUUID(), nombre: 'Mamá', rol, activo: true })

function pintar(rol: Perfil['rol']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/cuenta/x']}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return render(
    <Routes>
      <Route path="/cuenta/:id" element={<Cuenta perfil={perfil(rol)} />} />
    </Routes>,
    { wrapper: envolver },
  )
}

beforeEach(() => {
  llamar.mockReset()
  llamar.mockResolvedValue({})
})

describe('cuenta', () => {
  it('un mesero no ve «Cancelar» en lo enviado; un admin sí', () => {
    cuenta = cuentaCon([{}])
    const { unmount } = pintar('mesero')
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    expect(screen.getByText(/pide a un admin/i)).toBeInTheDocument()
    unmount()
    pintar('admin')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('«Enviar» cuenta solo lo nuevo y se bloquea sin nada nuevo', () => {
    cuenta = cuentaCon([{}])
    const { unmount } = pintar('mesero')
    expect(screen.getByRole('button', { name: 'Nada nuevo que enviar' })).toBeDisabled()
    unmount()
    cuenta = cuentaCon([{}, { estado: 'borrador', comanda_id: null, cantidad: 2 }])
    pintar('mesero')
    expect(screen.getByRole('button', { name: 'Enviar 2 a cocina' })).toBeEnabled()
  })

  it('no deja agregar alitas sin sabor y manda el sabor elegido', async () => {
    const usuario = userEvent.setup()
    cuenta = cuentaCon([])
    pintar('mesero')
    await usuario.click(await screen.findByRole('button', { name: /Alitas \(6 piezas\)/ }))
    const agregar = screen.getByRole('button', { name: /Agregar 1/ })
    expect(agregar).toBeDisabled()
    expect(screen.getByText('Falta elegir: Sabor.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: 'BBQ' }))
    await usuario.click(agregar)
    expect(llamar).toHaveBeenCalledWith(
      'agregar_linea',
      expect.objectContaining({ p_producto_id: alitas.id, p_modificador_ids: [bbq.id], p_cantidad: 1 }),
      expect.anything(),
    )
  })
})
