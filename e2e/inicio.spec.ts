import { expect, test } from '@playwright/test'

test('muestra la pantalla de inicio', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'La Isla' }),
  ).toBeVisible()
})
