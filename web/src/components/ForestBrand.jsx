import { Link } from 'react-router'
import './ForestBrand.css'

export default function ForestBrand({ compact = false }) {
  return (
    <Link
      className={`forest-brand${compact ? ' forest-brand-compact' : ''}`}
      to="/"
      aria-label="Bosque de La Primavera, inicio"
    >
      <svg width="64" height="48" viewBox="0 0 72 52" aria-hidden="true">
        <g fill="currentColor">
          <path d="M15 12 5 30h5L3 42h10v8h5v-8h10l-7-12h5Z" />
          <path d="M36 0 24 22h6L20 39h13v13h6V39h13L42 22h6Z" />
          <path d="M58 15 49 31h4l-7 12h10v7h5v-7h10l-7-12h4Z" />
        </g>
      </svg>
      <span>Bosque de<br />La Primavera</span>
    </Link>
  )
}
