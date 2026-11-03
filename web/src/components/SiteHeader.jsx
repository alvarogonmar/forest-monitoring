import './SiteHeader.css'
import { NavLink } from 'react-router'
import ForestBrand from './ForestBrand.jsx'

export default function SiteHeader() {
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

        <NavLink className="admin-access" to="/login">
          Acceso administrativo
        </NavLink>
      </div>
    </header>
  )
}
