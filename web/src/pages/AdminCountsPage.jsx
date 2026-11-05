import { useState } from 'react'
import { getCountsData } from '../services/dataService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import DataState from '../components/DataState.jsx'
import RoutesMap from '../components/RoutesMap.jsx'
import './AdminCountsPage.css'

export default function AdminCountsPage() {
  const [selectedId, setSelectedId] = useState(null)
  const resource = useAsyncData(getCountsData)
  const routes = resource.data?.routes ?? []
  const selected = routes.find((route) => route.id === selectedId) ?? routes[0]
  const count = resource.data?.counts.find((item) => item.routeId === selected?.id)?.count

  if (resource.status !== 'success' || !selected) {
    return <DataState status={resource.status} onRetry={resource.reload} emptyMessage="Todavía no hay rutas para consultar sus conteos." />
  }

  return (
    <>
      <div className="admin-toolbar">
        <label htmlFor="admin-count-route">Ruta</label>
        <select id="admin-count-route" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>{route.name}</option>
          ))}
        </select>
        <button className="data-refresh" type="button" onClick={resource.reload}>Actualizar</button>
      </div>
      <section className="admin-card admin-count-card" aria-label="Conteo y recorrido de la ruta seleccionada">
        <div className="admin-count-summary" aria-live="polite" aria-atomic="true">
          <h2>
            <span className="admin-count-route-color" style={{ backgroundColor: selected.color }} aria-hidden="true" />
            {selected.name}
          </h2>
          <p>Detecciones registradas · Ejemplo</p>
          {count == null
            ? <DataState status="empty" emptyMessage="Todavía no hay un conteo disponible para esta ruta." />
            : <strong className="admin-count">{count}</strong>}
          <p className="admin-count-note">
            El conteo corresponde a detecciones, no a personas distintas.
          </p>
          <p className="admin-count-demo-note">
            Datos ficticios de demostración, sin actualización en tiempo real.
          </p>
        </div>
        <div className="admin-count-map">
          <h3>Recorrido de la ruta</h3>
          <RoutesMap routes={[selected]} selectedId={selected.id} onSelect={setSelectedId} />
        </div>
      </section>
    </>
  )
}
