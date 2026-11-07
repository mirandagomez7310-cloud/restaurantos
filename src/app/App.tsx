import { BrowserRouter, Route, Routes } from 'react-router'
import { Acceso } from '@/features/auth/Acceso'
import { useSesion } from '@/features/auth/useSesion'
import { Catalogo } from '@/features/catalogo/Catalogo'
import { supabase } from '@/lib/supabase'
import estilos from './App.module.css'

function Inicio() {
  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <h1>La Isla</h1>
        <button
          className={estilos.salir}
          onClick={() => void supabase.auth.signOut()}
        >
          Salir
        </button>
      </header>
      <Catalogo />
    </main>
  )
}

export function App() {
  const sesion = useSesion()

  if (sesion === undefined) return <p>Cargando…</p>
  if (sesion === null) return <Acceso />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  )
}
