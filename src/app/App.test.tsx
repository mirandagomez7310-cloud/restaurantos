import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
  },
}))

it('pide entrar cuando no hay sesión', async () => {
  render(<App />)
  expect(
    await screen.findByRole('button', { name: 'Entrar' }),
  ).toBeInTheDocument()
})
