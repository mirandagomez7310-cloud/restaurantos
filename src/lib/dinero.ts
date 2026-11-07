const opciones = { style: 'currency', currency: 'MXN' } as const
const conCentavos = new Intl.NumberFormat('es-MX', opciones)
const sinCentavos = new Intl.NumberFormat('es-MX', {
  ...opciones,
  maximumFractionDigits: 0,
})

export function formatoPrecio(centavos: number): string {
  const formato = centavos % 100 === 0 ? sinCentavos : conCentavos
  return formato.format(centavos / 100)
}
