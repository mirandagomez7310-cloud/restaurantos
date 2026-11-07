# App La Isla

Sistema privado de operación y gestión del restaurante La Isla.

## Requisitos

Node 24 y un proyecto de Supabase.

## Instalación

```sh
npm install
npx playwright install chromium
```

Copia `.env.example` a `.env.local` y llena sus valores.

## Scripts

| Script              | Qué hace                    |
| ------------------- | --------------------------- |
| `npm run dev`       | Servidor de desarrollo      |
| `npm run build`     | Compila para producción     |
| `npm run typecheck` | Revisa tipos                |
| `npm run lint`      | Revisa el código con oxlint |
| `npm run format`    | Da formato con Prettier     |
| `npm test`          | Pruebas unitarias           |
| `npm run test:e2e`  | Pruebas E2E con Playwright  |

## Variables de entorno

Ver `.env.example`. Solo valores públicos: la app corre en el navegador.

## Despliegue

Sitio estático en Cloudflare Pages (pendiente de configurar).
