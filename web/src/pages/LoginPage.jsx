import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession } from '../auth/sessionContext.js'
import forestImage from '../assets/forest.png'
import './LoginPage.css'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const errorBox = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const navigate = useNavigate()
  const { login } = useSession()

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    pending.current = true
    setSubmitting(true)
    setErrorMessage('')
    setMessage('Comprobando tus datos…')
    try {
      await login({ email: data.get('email'), password: data.get('password') })
      form.reset()
      setShowPassword(false)
      navigate('/admin/mapa', { replace: true })
    } catch (error) {
      setMessage('')
      setErrorMessage(error.message)
      requestAnimationFrame(() => errorBox.current?.focus())
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-photo" style={{ backgroundImage: `url(${forestImage})` }}>
        <p>Un espacio para cuidar el bosque.</p>
      </div>

      <section className="login-content" aria-labelledby="login-title">
        <p className="login-eyebrow">ACCESO ADMINISTRATIVO</p>
        <h1 id="login-title">Bienvenido de nuevo</h1>
        <p className="login-note" id="login-note">
          Ingresa con tu cuenta de administrador.
        </p>

        <form onSubmit={handleSubmit} aria-describedby="login-note" aria-busy={submitting}>
          <div className="login-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Ingresa tu correo"
              disabled={submitting}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <div className="login-password">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                disabled={submitting}
                required
              />
              <button
                type="button"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="login-error" role="alert" tabIndex={-1} ref={errorBox}>
              <span className="login-error-icon" aria-hidden="true">!</span>
              <div>
                <strong>No pudimos iniciar sesión</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'} <span aria-hidden="true">→</span>
          </button>
          <p className="login-message" role="status">{message}</p>
        </form>

        <Link className="login-back" to="/">
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>
      </section>
    </main>
  )
}
