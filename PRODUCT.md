# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientes de La Isla:** quienes lavan su coche en el autolavado, trabajadores de la zona, vecinos del fraccionamiento, familias y jóvenes. Llegan casi siempre desde el celular, por un QR, Google Maps o WhatsApp, con hambre y poco tiempo.
- **Equipo:** tres personas de una familia sin experiencia administrativa. Mamá atiende mesas y cobra, de pie y con prisa, en su celular Android. Papá cocina y prepara bebidas. Miranda cocina, administra y revisa números en celular y computadora.

## Product Purpose

La Isla tiene dos experiencias. El sitio público da a conocer el restaurante y lleva a WhatsApp. El sistema privado registra la operación diaria, previene errores humanos y permite detectar problemas antes de que sean pérdidas. El éxito inmediato es decidir en enero de 2027, con datos reales, si se renueva el local.

## Positioning

Restaurante familiar con parrilla de carbón a la vista en Hacienda del Parque: se come al aire libre, bajo un árbol, con tacos de cortes, hamburguesas y parrilladas. La marca es independiente: el autolavado es solo un dato de ubicación, no parte de la identidad. La frase «parrilla al carbón» es hipótesis de propuesta de valor y aún se valida con clientes.

## Operating Context

- Sitio: Hacienda del Parque, Sierra Vieja, Cuautitlán Izcalli, dentro del autolavado. 6 mesas, unas 30 personas, mesas al exterior con plantas, dos accesos.
- Horario: martes y miércoles 11:00 a 20:30; jueves a sábado 11:00 a 23:00; domingo 11:00 a 17:00; lunes cerrado.
- Servicio: comer aquí, para llevar y entrega solo dentro del fraccionamiento. Pedidos por WhatsApp al 56 3392 4236.
- Cobro: efectivo, tarjeta con terminal Clip y transferencia. Hay propinas. No se emiten facturas.
- Una laptop adicional puede conectarse a la impresora de tickets.
- Internet del local reportado como estable.

## Capabilities and Constraints

- **No anunciar alcohol:** el sitio y cualquier mensaje a clientes muestran solo comida y bebidas sin alcohol. Sí se vende y sí existe en el sistema interno.
- Presupuesto de marketing de $0. Hosting gratis. Sin descuentos ni promociones sin costear.
- Consumo familiar nunca es venta. El préstamo Clip no es gasto del día. Propinas aparte de la venta.
- Sistema aprobado por etapas: caja, salón y pedidos, tablero y alertas, luego decisión de enero. Inventario, recetas y mermas solo si el negocio sigue.
- Stack del sistema: React, Vite, TypeScript y Supabase. Sitio público: Astro estático en Cloudflare Pages, sin acceso a la base de datos.

## Brand Commitments

- Nombre: **La Isla**. Ya no usar «La Isla del GOYO».
- Logo existente: letras «LA ISLA» en arco, amarillas, isla de arena, palmera, gaviotas y rayos, dibujado a mano. Se conserva.
- Lema del menú: «Tacos, alitas, hamburguesas y más». Frases ya usadas: «¡El verdadero sabor!», «¡Agrégale un extra a tu isla!».
- Hamburguesas con nombre propio: La Náufrago, La Isla Clásica, La Palmera.
- Tono cercano y familiar, en español de México.
- Miranda delegó paleta, tipografía, iconos, animación y componentes, y debe aprobar cambios grandes de identidad o funcionalidad.

## Evidence on Hand

- Fotos de julio de 2026, autorizadas: `C:\Users\miran\OneDrive\Documentos\La Isla\03_Identidad_ marketing\0.1_FOTOS`.
- Logo: `LOGO_LA_ISLA.pdf` en esa carpeta (imagen de 1030×579, no vectorial). Menú impreso: `MENÚ ISLA.pdf`.
- Precios: menú impreso, con correcciones de Miranda en la nota de menú de Obsidian.
- No hay testimonios propios. Las reseñas de Google son del perfil del dueño anterior: no se publican ni se citan.
- Sin confirmar: pantalla para partidos y si se aceptan mascotas.

## Product Principles

1. Primero evitar el error; después registrarlo.
2. La tarea frecuente se hace en pocos toques, de pie y con una mano.
3. Nunca inventar datos: lo que falta se muestra como falta.
4. Mostrar la verdad del negocio con claridad, sin tablas cuando basta un semáforo.
5. Lo público vende comida real, hecha por esta familia en este lugar.

## Accessibility & Inclusion

Contraste AA, foco visible, objetivos táctiles grandes y `prefers-reduced-motion`. Las personas usuarias no son expertas en software. Los estados nunca dependen solo del color.
