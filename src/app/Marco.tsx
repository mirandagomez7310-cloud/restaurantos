import type { ReactNode } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { NavLink, useLocation } from 'react-router'
import type { Perfil } from '@/features/perfil/usePerfil'
import { useTiempoReal } from '@/lib/useTiempoReal'
import estilos from './Marco.module.css'

function ErrorPantalla({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className={estilos.errorPantalla}>
      <p>Esta pantalla falló. Lo demás sigue funcionando.</p>
      <button type="button" onClick={resetErrorBoundary}>
        Reintentar
      </button>
    </div>
  )
}

export function Marco({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  useTiempoReal()
  const { pathname } = useLocation()
  const destinos = [
    { a: '/salon', texto: 'Mesas' },
    { a: '/cocina', texto: 'Cocina' },
    ...(perfil.rol === 'admin' ? [{ a: '/dia', texto: 'Día' }] : []),
  ]

  return (
    <div className={estilos.marco}>
      <nav className={estilos.nav} aria-label="Principal">
        <span className={estilos.marca}>La Isla</span>
        {destinos.map((d) => (
          <NavLink
            key={d.a}
            to={d.a}
            className={({ isActive }) =>
              [estilos.destino, (isActive || (d.a === '/salon' && pathname.startsWith('/cuenta'))) && estilos.activo]
                .filter(Boolean)
                .join(' ')
            }
          >
            {d.texto}
          </NavLink>
        ))}
      </nav>
      <main className={estilos.contenido}>
        <ErrorBoundary FallbackComponent={ErrorPantalla} resetKeys={[pathname]}>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}
