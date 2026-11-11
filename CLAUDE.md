# restaurantOS

ERP multi-negocio para restaurantes. La Isla es el primer cliente: sus datos son configuración, nunca valores fijos en el código.

## Stack

React 19 + Vite 8 + TS strict · Supabase · TanStack Query · React Router · Zod · CSS Modules · Node 24.

## Comandos

`npm run dev` · `build` · `typecheck` · `lint` · `format` · `test` · `test:e2e`

## Estructura

- `src/app/`: App, providers y rutas
- `src/components/ui/`: componentes sin lógica de negocio
- `src/features/<x>/`: components, hooks, api.ts, schemas.ts
- `src/lib/`: utilidades
- `src/env.ts`: único lector de variables de entorno
- `e2e/`: pruebas Playwright

## Reglas del negocio

- Dinero en centavos enteros. Dinero e inventario son movimientos: se anulan con motivo, no se editan ni se borran.
- Consumo familiar nunca es venta. El préstamo Clip no es gasto del día. Las propinas no son venta, pero sí entran al total de Clip.
- Una noche que cierra de madrugada pertenece al día operativo en que abrió. Zona horaria `America/Mexico_City`.
- Ningún dato inventado: si falta un costo, se muestra como «falta».
- RLS en todas las tablas. Ningún secreto en el navegador.
- Interfaz para usarse de pie y con prisa: botones grandes, pocos pasos.

## Nota Obsidian

`01 Proyectos/restaurantOS/App La Isla.md`. Visión multi-negocio: `App La Isla - 10 Reevaluación ERP multi-negocio.md`. Plan técnico: `App La Isla - 09 Plan técnico definitivo.md`.
