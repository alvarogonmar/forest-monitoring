import { useState } from 'react'
import { demoRoutes } from '../data/routes'
import { demoCounts } from '../data/adminDemo'
import RoutesMap from '../components/RoutesMap.jsx'
import './AdminCountsPage.css'

export default function AdminCountsPage() {
  const [selectedId, setSelectedId] = useState(demoRoutes[0].id)
  const selected = demoRoutes.find((route) => route.id === selectedId)

  return (
    <>
      <div className="admin-toolbar">
        <label htmlFor="admin-count-route">Ruta</label>
        <select id="admin-count-route" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {demoRoutes.map((route) => (
            <option key={route.id} value={route.id}>{route.name}</option>
          ))}
        </select>
      </div>
      <section className="admin-card admin-count-card" aria-label="Conteo y recorrido de la ruta seleccionada">
        <div className="admin-count-summary" aria-live="polite" aria-atomic="true">
          <h2>
            <span className="admin-count-route-color" style={{ backgroundColor: selected.color }} aria-hidden="true" />
            {selected.name}
          </h2>
          <p>Detecciones registradas · Ejemplo</p>
          <strong className="admin-count">{demoCounts[selectedId]}</strong>
          <p className="admin-count-note">
            El conteo corresponde a detecciones, no a personas distintas.
          </p>
          <p className="admin-count-demo-note">
            Datos ficticios de demostración, sin actualización en tiempo real.
          </p>
        </div>
        <div className="admin-count-map">
          <h3>Recorrido de la ruta</h3>
          <RoutesMap routes={[selected]} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </section>
    </>
  )
}
