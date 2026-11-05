import { useState } from 'react'
import { Link } from 'react-router'
import { getRoutes } from '../services/dataService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import DataState from '../components/DataState.jsx'
import RoutesMap from '../components/RoutesMap.jsx'
import './RoutesPage.css'

export default function RoutesPage() {
  const [selectedId, setSelectedId] = useState(null)
  const resource = useAsyncData(getRoutes)
  const routes = resource.data ?? []

  const selectedRoute = routes.find(
    (route) => route.id === selectedId,
  )

  return (
    <main className="routes-page">
      <p className="routes-breadcrumb">
        <Link to="/">Inicio</Link> / Rutas
      </p>

      <h1>Explora los senderos</h1>
      <p className="routes-description">
        Elige una ruta para conocer su recorrido, inicio y final.
      </p>

      {resource.status !== 'success' || routes.length === 0 ? (
        <DataState status={resource.status} onRetry={resource.reload} emptyMessage="Todavía no hay rutas disponibles." />
      ) : <div className="routes-layout">
        <aside className="routes-sidebar" aria-labelledby="routes-list-title">
          <h2 id="routes-list-title">Rutas disponibles</h2>
          <p>Recorridos de demostración</p>

          <ul className="routes-list">
            {routes.map((route) => (
              <li key={route.id}>
                <button
                  type="button"
                  className="route-card"
                  aria-pressed={selectedId === route.id}
                  onClick={() => setSelectedId(route.id)}
                >
                  <span
                    className="route-color"
                    style={{ backgroundColor: route.color }}
                    aria-hidden="true"
                  />

                  <span className="route-card-text">
                    <strong>{route.name}</strong>
                    <span>Ver recorrido</span>
                  </span>

                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="routes-help">
            Selecciona una ruta en la lista o directamente en el mapa.
          </p>
          {selectedRoute && (
            <section className="route-details" aria-label="Detalle de ruta" aria-live="polite">
              <h3>{selectedRoute.name}</h3>
              <p>Recorrido ficticio de demostración</p>
              <dl>
                <dt>Inicio (latitud, longitud)</dt>
                <dd>{selectedRoute.coordinates[0].join(', ')}</dd>
                <dt>Final (latitud, longitud)</dt>
                <dd>{selectedRoute.coordinates.at(-1).join(', ')}</dd>
              </dl>
              <button type="button" className="routes-reset" onClick={() => setSelectedId(null)}>
                Ver todas las rutas
              </button>
            </section>
          )}
        </aside>

        <RoutesMap routes={routes} selectedId={selectedRoute?.id ?? null} onSelect={setSelectedId} />
      </div>}
    </main>
  )
}
