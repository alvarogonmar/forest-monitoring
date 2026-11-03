import { getHelpRequests } from '../services/dataService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import DataState from '../components/DataState.jsx'

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium', timeZone: 'America/Mexico_City',
})
const timeFormat = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
})

export default function AdminRequestsPage() {
  const resource = useAsyncData(getHelpRequests)
  const requests = resource.data ?? []

  return (
    <>
    <div className="admin-toolbar">
      <span>Solicitudes recibidas · Demostración</span>
      <button className="data-refresh" type="button" onClick={resource.reload} disabled={resource.status === 'loading'}>
        Actualizar
      </button>
    </div>
    {resource.status !== 'success' || requests.length === 0
      ? <DataState status={resource.status} onRetry={resource.reload} emptyMessage="Todavía no hay solicitudes recibidas." />
      : (
    <section className="admin-card">
      <div className="admin-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de solicitudes de demostración">
        <table className="admin-table">
          <caption>Fecha, hora original y coordenadas de cada solicitud · Datos ficticios</caption>
          <thead>
            <tr>
              <th scope="col">Folio</th>
              <th scope="col">Fecha</th>
              <th scope="col">Hora</th>
              <th scope="col">Coordenadas (latitud, longitud)</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <th scope="row">{request.id}</th>
                <td>{dateFormat.format(new Date(request.occurredAt))}</td>
                <td>{timeFormat.format(new Date(request.occurredAt))}</td>
                <td>{request.coordinates
                  ? request.coordinates.map((value) => value.toFixed(6)).join(', ')
                  : 'Ubicación pendiente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    )}
    </>
  )
}
