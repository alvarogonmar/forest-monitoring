import { useState } from 'react'
import { demoRoutes } from '../data/routes'
import { demoCounts } from '../data/adminDemo'

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
      <section className="admin-card" aria-live="polite" aria-atomic="true">
        <h2>{selected.name}</h2>
        <p>Detecciones registradas · Ejemplo</p>
        <strong className="admin-count">{demoCounts[selectedId]}</strong>
        <p className="admin-count-note">
          El conteo corresponde a detecciones, no a personas distintas.
          Estos valores son ficticios y no se actualizan en tiempo real.
        </p>
      </section>
    </>
  )
}
