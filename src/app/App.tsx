import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Acceso } from '@/features/auth/Acceso'
import { useSesion } from '@/features/auth/useSesion'
import { Catalogo } from '@/features/catalogo/Catalogo'
import { Cuenta } from '@/features/cuenta/Cuenta'
import { Dia } from '@/features/dia/Dia'
import { Estacion } from '@/features/estacion/Estacion'
import { usePerfil, type Perfil } from '@/features/perfil/usePerfil'
import { Plano } from '@/features/plano/Plano'
import { Salon } from '@/features/salon/Salon'
import { supabase } from '@/lib/supabase'
import { Marco } from './Marco'
import estilos from './App.module.css'

function SinAcceso() {
  return (
    <main className={estilos.pagina}>
      <h1>La Isla</h1>
      <p role="alert">Tu cuenta todavía no está activa. Pide a Miranda que la active.</p>
      <button className={estilos.salir} onClick={() => void supabase.auth.signOut()}>
        Salir
      </button>
    </main>
  )
}

function Rutas({ perfil }: { perfil: Perfil }) {
  // La laptop de cocina solo ve su cola de impresión.
  if (perfil.rol === 'estacion') {
    return (
      <main className={estilos.pagina}>
        <Estacion perfil={perfil} />
      </main>
    )
  }
  const esAdmin = perfil.rol === 'admin'
  return (
    <Marco perfil={perfil}>
      <Routes>
        <Route path="/salon" element={<Salon perfil={perfil} />} />
        <Route path="/cuenta/:id" element={<Cuenta perfil={perfil} />} />
        <Route path="/cocina" element={<Estacion perfil={perfil} />} />
        {esAdmin && <Route path="/dia" element={<Dia />} />}
        {esAdmin && <Route path="/plano" element={<Plano />} />}
        {esAdmin && <Route path="/menu" element={<Catalogo />} />}
        <Route path="*" element={<Navigate to="/salon" replace />} />
      </Routes>
    </Marco>
  )
}

function ConSesion({ usuarioId }: { usuarioId: string }) {
  const perfil = usePerfil(usuarioId)
  if (perfil.isPending) return <p className={estilos.pagina}>Cargando…</p>
  if (perfil.error) {
    return (
      <p role="alert" className={estilos.pagina}>
        No se pudo cargar tu cuenta. Revisa la conexión y recarga.
      </p>
    )
  }
  if (!perfil.data?.activo) return <SinAcceso />
  return <Rutas perfil={perfil.data} />
}

export function App() {
  const sesion = useSesion()

  if (sesion === undefined) return <p>Cargando…</p>
  if (sesion === null) return <Acceso />

  return (
    <BrowserRouter>
      <ConSesion usuarioId={sesion.user.id} />
    </BrowserRouter>
  )
}
