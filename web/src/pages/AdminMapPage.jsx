import { useState } from 'react'
import RoutesMap from '../components/RoutesMap.jsx'
import SensorPointsLayer from '../components/SensorPointsLayer.jsx'
import { getMapData } from '../services/dataService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import DataState from '../components/DataState.jsx'
import './AdminMapPage.css'

export default function AdminMapPage() {
  const [routeId, setSelectedId] = useState(null)
  const [selectedPointId, setSelectedPointId] = useState(null)
  const resource = useAsyncData(getMapData)
  const routes = resource.data?.routes ?? []
  const points = resource.data?.points ?? []
  const selectedId = routes.some((route) => route.id === routeId) ? routeId : null
  const visiblePoints = points.filter((point) => !selectedId || point.routeId === selectedId)
  const selectedPoint = visiblePoints.find((point) => point.id === selectedPointId)
  const selectedRoute = routes.find((route) => route.id === selectedPoint?.routeId)

  function selectRoute(routeId) {
    setSelectedId(routeId)
    setSelectedPointId(null)
  }

  function selectPoint(pointId) {
    const point = points.find((item) => item.id === pointId)
    if (!point) return
    setSelectedPointId(pointId)
    setSelectedId(point.routeId)
  }

  if (resource.status !== 'success' || routes.length === 0) {
    return <DataState status={resource.status} onRetry={resource.reload} emptyMessage="Todavía no hay rutas para mostrar en el mapa." />
  }

  return (
    <>
      <div className="admin-toolbar">
        <label htmlFor="admin-map-route">Ruta</label>
        <select
          id="admin-map-route"
          value={selectedId ?? ''}
          onChange={(event) => selectRoute(event.target.value || null)}
        >
          <option value="">Todas las rutas</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>{route.name}</option>
          ))}
        </select>
        <p className="sensor-toolbar-help">Selecciona un punto para ver sus detalles.</p>
      </div>
      <div className="sensor-map-frame">
        <RoutesMap routes={routes} selectedId={selectedId} onSelect={selectRoute} showEndpoints={false}>
          <SensorPointsLayer points={visiblePoints} selectedId={selectedPointId} onSelect={selectPoint} />
        </RoutesMap>

        {selectedPoint && (
          <section className="sensor-detail" aria-labelledby="sensor-detail-title">
            <div className="sensor-detail-heading">
              <p>PUNTO SELECCIONADO</p>
              <button
                type="button"
                aria-label="Cerrar ficha del punto"
                onClick={() => setSelectedPointId(null)}
              >×</button>
            </div>
            <h2 id="sensor-detail-title">Punto {selectedPoint.id}</h2>
            <p className="sensor-route-name">
              <span style={{ backgroundColor: selectedRoute?.color ?? '#153e32' }} aria-hidden="true" />
              {selectedRoute?.name ?? 'Ruta no disponible'}
            </p>
            <dl>
              <dt>Identificador</dt>
              <dd>{selectedPoint.id}</dd>
              <dt>Latitud</dt>
              <dd>{selectedPoint.coordinates[0].toFixed(6)}</dd>
              <dt>Longitud</dt>
              <dd>{selectedPoint.coordinates[1].toFixed(6)}</dd>
            </dl>
            <p className="sensor-demo-note">Ubicación ficticia de demostración.</p>
          </section>
        )}
      </div>

      <section className="sensor-point-list" aria-labelledby="sensor-point-list-title">
        <h2 id="sensor-point-list-title">Puntos de monitoreo</h2>
        <p role="status">{visiblePoints.length} puntos de demostración en la vista actual.</p>
        <div className="sensor-point-buttons">
          {visiblePoints.map((point) => (
            <button
              key={point.id}
              type="button"
              aria-pressed={selectedPointId === point.id}
              onClick={() => selectPoint(point.id)}
            >{point.id}</button>
          ))}
        </div>
        {visiblePoints.length === 0 && (
          <DataState status="empty" onRetry={resource.reload} emptyMessage="Todavía no hay puntos de monitoreo para esta selección." />
        )}
      </section>
    </>
  )
}
