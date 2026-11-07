import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import estilos from './Acceso.module.css'

export function Acceso() {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    setEnviando(true)
    setError('')
    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: String(datos.get('correo')),
      password: String(datos.get('clave')),
    })
    setEnviando(false)
    if (fallo) setError('No pudimos entrar. Revisa tu correo y contraseña.')
  }

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>La Isla</h1>
      <form className={estilos.forma} onSubmit={(e) => void entrar(e)}>
        <label className={estilos.campo}>
          Correo
          <input name="correo" type="email" autoComplete="email" required />
        </label>
        <label className={estilos.campo}>
          Contraseña
          <input
            name="clave"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className={estilos.boton} disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
