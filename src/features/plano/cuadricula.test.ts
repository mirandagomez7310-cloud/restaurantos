import { expect, it } from 'vitest'
import { celdaBajoPuntero, moverConTecla, posicionValida, type Caja } from './cuadricula'

const mesa = (id: string, x: number, y: number): Caja => ({ id, x, y, ancho: 2, alto: 2 })
const otras = [mesa('a', 0, 0), mesa('b', 4, 0)]

it('no deja encimar mesas ni sacarlas de la cuadrícula', () => {
  expect(posicionValida(mesa('c', 2, 0), otras)).toBe(true)
  expect(posicionValida(mesa('c', 1, 1), otras)).toBe(false)
  expect(posicionValida(mesa('c', -1, 5), otras)).toBe(false)
  expect(posicionValida(mesa('c', 11, 5), otras)).toBe(false)
  // Moverse sobre su propio lugar no cuenta como encimarse.
  expect(posicionValida(mesa('a', 0, 1), otras)).toBe(true)
})

it('convierte el puntero en celda', () => {
  const rect = { left: 100, top: 50, width: 1200, height: 1000 }
  expect(celdaBajoPuntero(rect, 100, 50)).toEqual({ x: 0, y: 0 })
  expect(celdaBajoPuntero(rect, 1299, 1049)).toEqual({ x: 11, y: 9 })
})

it('las flechas mueven una celda', () => {
  expect(moverConTecla(mesa('a', 3, 3), 'ArrowLeft')).toMatchObject({ x: 2, y: 3 })
  expect(moverConTecla(mesa('a', 3, 3), 'Enter')).toBeNull()
})
