import { useState } from 'react'
import RoutesMap from '../components/RoutesMap.jsx'
import { demoRoutes } from '../data/routes'

export default function AdminMapPage() {
  const [selectedId, setSelectedId] = useState(null)

  return (
    <>
      <div className="admin-toolbar">
        <label htmlFor="admin-map-route">Ruta</label>
        <select
          id="admin-map-route"
          value={selectedId ?? ''}
          onChange={(event) => setSelectedId(event.target.value || null)}
        >
          <option value="">Todas las rutas</option>
          {demoRoutes.map((route) => (
            <option key={route.id} value={route.id}>{route.name}</option>
          ))}
        </select>
      </div>
      <RoutesMap routes={demoRoutes} selectedId={selectedId} onSelect={setSelectedId} />
    </>
  )
}
