import { expect, it } from 'vitest'
import { formatoPrecio } from './dinero'

it('muestra pesos a partir de centavos', () => {
  expect(formatoPrecio(15000)).toBe('$150')
  expect(formatoPrecio(3850)).toBe('$38.50')
  expect(formatoPrecio(0)).toBe('$0')
})
