import { Link, Navigate, Outlet } from 'react-router'
import { useSession } from '../auth/sessionContext.js'

export default function SessionGate({ signedOutOnly = false }) {
  const { session, checking, error, retry } = useSession()
  if (checking) {
    return <section className="routes-page" role="status">Comprobando tu sesión…</section>
  }
  if (error) {
    return (
      <section className="routes-page">
        <h1>No pudimos comprobar tu sesión</h1>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>Reintentar</button>
        <p><Link to="/">Volver al inicio</Link></p>
      </section>
    )
  }
  if (signedOutOnly && session) return <Navigate to="/admin/mapa" replace />
  if (!signedOutOnly && !session) return <Navigate to="/login" replace />
  return <Outlet />
}
