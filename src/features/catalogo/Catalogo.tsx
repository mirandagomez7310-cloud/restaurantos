import { useQuery } from '@tanstack/react-query'
import { formatoPrecio } from '@/lib/dinero'
import { agruparPorCategoria, leerProductos } from './api'
import estilos from './Catalogo.module.css'

export function Catalogo() {
  const { data, error, isPending } = useQuery({
    queryKey: ['productos'],
    queryFn: leerProductos,
  })

  if (isPending) return <p>Cargando catálogo…</p>
  if (error) {
    return (
      <p role="alert">No se pudo cargar el catálogo. Revisa tu conexión.</p>
    )
  }
  if (data.length === 0) {
    return (
      <p role="alert">
        No hay productos para mostrar. Si tu cuenta es nueva, falta activarla.
      </p>
    )
  }

  return (
    <>
      {agruparPorCategoria(data).map((grupo) => (
        <section key={grupo.nombre} className={estilos.grupo}>
          <h2>{grupo.nombre}</h2>
          <ul className={estilos.lista}>
            {grupo.productos.map((producto) => (
              <li key={producto.id} className={estilos.fila}>
                <span>
                  {producto.nombre}
                  {producto.favorito && (
                    <span className={estilos.etiqueta}>Favorito</span>
                  )}
                  {!producto.visible_web && (
                    <span className={estilos.etiqueta}>Solo interno</span>
                  )}
                </span>
                <span>{formatoPrecio(producto.precio_centavos)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
