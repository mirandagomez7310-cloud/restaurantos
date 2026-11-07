import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'

it('muestra el nombre del negocio', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { level: 1, name: 'La Isla' }),
  ).toBeInTheDocument()
})
