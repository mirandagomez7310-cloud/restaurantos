import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { lanzarSiFalla, llamar } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import {
  cuentaResumenEsquema,
  diaEsquema,
  dispositivoEsquema,
  mesaEsquema,
  trabajoEsquema,
} from './schemas'

const conId = z.object({ id: z.uuid() })

async function leerSalon() {
  const [dia, mesas, cuentas] = await Promise.all([
    supabase
      .from('dias_operativos')
      .select('id, fecha_operativa, abierto_en, cerrado_en')
      .is('cerrado_en', null)
      .maybeSingle(),
    supabase
      .from('mesas')
      .select('id, nombre, x, y, ancho, alto, forma, orden')
      .eq('activa', true)
      .order('orden'),
    supabase
      .from('cuentas')
      .select('id, numero, tipo, mesa_id, nombre, abierta_en, lineas(precio_unit_centavos, cantidad, estado)')
      .eq('estado', 'abierta')
      .order('abierta_en'),
  ])
  lanzarSiFalla(dia.error ?? mesas.error ?? cuentas.error)
  return {
    dia: dia.data ? diaEsquema.parse(dia.data) : null,
    mesas: z.array(mesaEsquema).parse(mesas.data),
    cuentas: z.array(cuentaResumenEsquema).parse(cuentas.data),
  }
}

export function useSalon() {
  return useQuery({ queryKey: ['salon'], queryFn: leerSalon })
}

const columnasTrabajo =
  'id, tipo, estado, creado_en, impreso_en, intentos, error, copia, motivo, contenido, comandas(cuenta_id)'

async function leerPendientes() {
  const { data, error } = await supabase
    .from('trabajos_impresion')
    .select(columnasTrabajo)
    .in('estado', ['pendiente', 'tomado', 'fallido'])
    .order('creado_en')
  lanzarSiFalla(error)
  return z.array(trabajoEsquema).parse(data)
}

export function usePendientes() {
  return useQuery({ queryKey: ['trabajos', 'pendientes'], queryFn: leerPendientes })
}

async function leerImpresos() {
  const { data, error } = await supabase
    .from('trabajos_impresion')
    .select(columnasTrabajo)
    .eq('estado', 'impreso')
    .order('impreso_en', { ascending: false })
    .limit(20)
  lanzarSiFalla(error)
  return z.array(trabajoEsquema).parse(data)
}

export function useImpresos() {
  return useQuery({ queryKey: ['trabajos', 'impresos'], queryFn: leerImpresos })
}

async function leerDispositivos() {
  const { data, error } = await supabase.from('dispositivos').select('id, nombre, ultimo_latido')
  lanzarSiFalla(error)
  return z.array(dispositivoEsquema).parse(data)
}

export function useDispositivos() {
  return useQuery({ queryKey: ['dispositivos'], queryFn: leerDispositivos })
}

export function abrirCuenta(args: {
  id: string
  tipo: 'mesa' | 'llevar' | 'entrega'
  mesaId?: string
  nombre?: string
}) {
  return llamar(
    'abrir_cuenta',
    { p_id: args.id, p_tipo: args.tipo, p_mesa_id: args.mesaId ?? null, p_nombre: args.nombre ?? '' },
    conId,
  )
}
