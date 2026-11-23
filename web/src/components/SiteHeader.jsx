import './SiteHeader.css'
import { NavLink } from 'react-router'
import ForestBrand from './ForestBrand.jsx'
import { useSession } from '../auth/sessionContext.js'

export default function SiteHeader() {
  const { session, checking } = useSession()
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <ForestBrand />

        <nav className="site-nav" aria-label="Navegación principal">
        <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'site-nav-active' : ''}
        >
            Inicio
        </NavLink>

        <NavLink
            to="/rutas"
            className={({ isActive }) => isActive ? 'site-nav-active' : ''}
        >
            Rutas
        </NavLink>

        <a href="/#visita">Tu visita</a>
        </nav>

        {checking ? (
          <span className="profile-access profile-access-loading" role="status" aria-label="Comprobando sesión">…</span>
        ) : session ? (
          <NavLink className="profile-access" to="/admin/mapa" aria-label="Mi perfil: abrir panel administrativo" title="Mi perfil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </NavLink>
        ) : (
          <NavLink className="admin-access" to="/login">
            Acceso administrativo
          </NavLink>
        )}
      </div>
    </header>
  )
}
