import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { App } from '@/app/App'
import { Providers } from '@/app/providers'
import '@/styles/global.css'

function ErrorGeneral() {
  return (
    <p role="alert">
      Algo salió mal. Recarga la página; si sigue igual, avisa a Miranda.
    </p>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorGeneral}>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
)
