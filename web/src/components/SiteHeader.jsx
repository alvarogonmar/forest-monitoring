import './SiteHeader.css'
import { NavLink } from 'react-router'

function ForestLogo() {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 72 52"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path d="M15 12 5 30h5L3 42h10v8h5v-8h10l-7-12h5Z" />
        <path d="M36 0 24 22h6L20 39h13v13h6V39h13L42 22h6Z" />
        <path d="M58 15 49 31h4l-7 12h10v7h5v-7h10l-7-12h4Z" />
      </g>
    </svg>
  )
}

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-brand" href="/" aria-label="Bosque de La Primavera, inicio">
          <ForestLogo />
          <span>
            Bosque de
            <br />
            La Primavera
          </span>
        </a>

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

        <NavLink className="admin-access" to="/login">
          Acceso administrativo
        </NavLink>
      </div>
    </header>
  )
}
