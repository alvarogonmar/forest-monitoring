import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useSession } from '../auth/sessionContext.js'
import './AdminLayout.css'
import ForestBrand from './ForestBrand.jsx'

const sections = [
  { to: '/admin/mapa', label: 'Mapa', title: 'Mapa del bosque', icon: 'M3 5 9 3l6 3 6-3v16l-6 3-6-3-6 2V5Zm6-2v16m6-13v16' },
  { to: '/admin/conteos', label: 'Conteos', title: 'Conteos por ruta', icon: 'M5 20v-7m7 7V4m7 16V9' },
  { to: '/admin/solicitudes', label: 'Solicitudes', title: 'Solicitudes recibidas', icon: 'M6 2h9l6 6v14H6V2Zm9 0v6h6m-11 4h7m-7 5h7' },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { session, logout } = useSession()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const pendingLogout = useRef(false)

  async function handleLogout() {
    if (pendingLogout.current) return
    pendingLogout.current = true
    setSigningOut(true)
    setLogoutError('')
    try {
      await logout(session.csrfToken)
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      pendingLogout.current = false
      setSigningOut(false)
    }
  }
  const currentSection = sections.find((section) => section.to === pathname)

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <ForestBrand compact />
        <p className="admin-sidebar-label">Panel de administración</p>
        <nav className="admin-nav" aria-label="Navegación administrativa">
          {sections.map((section) => (
            <NavLink key={section.to} to={section.to}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={section.icon} />
              </svg>
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-session">
          <p>{session.user.email}</p>
          <button type="button" onClick={handleLogout} disabled={signingOut}>
            {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
        </div>
        <Link className="admin-return" to="/">← Volver al sitio</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-heading">
          <div>
            <p>BOSQUE DE LA PRIMAVERA</p>
            <h1>{currentSection?.title ?? 'Panel administrativo'}</h1>
          </div>
          <span className="admin-demo-badge">Vista de demostración</span>
        </header>
        <p className="admin-demo-notice">
          Datos ficticios para explorar el panel.
        </p>
        <Outlet />
      </main>
    </div>
  )
}
