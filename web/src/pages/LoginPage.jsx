import { useState } from 'react'
import { Link } from 'react-router'
import forestImage from '../assets/forest.png'
import './LoginPage.css'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    if (!data.get('username').trim()) {
      setMessage('Escribe tu usuario.')
      form.elements.namedItem('username').focus()
      return
    }

    setMessage(
      'Formulario validado. El inicio de sesión estará disponible al conectar el backend.',
    )
    form.reset()
    setShowPassword(false)
  }

  return (
    <main className="login-page">
      <div className="login-photo" style={{ backgroundImage: `url(${forestImage})` }}>
        <p>Un espacio para cuidar el bosque.</p>
      </div>

      <section className="login-content" aria-labelledby="login-title">
        <p className="login-eyebrow">ACCESO ADMINISTRATIVO</p>
        <h1 id="login-title">Bienvenido de nuevo</h1>
        <p className="login-demo-note" id="login-demo-note">
          Vista de demostración. Usa datos de prueba.
        </p>

        <form onSubmit={handleSubmit} aria-describedby="login-demo-note">
          <div className="login-field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Ingresa tu usuario"
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

          <button className="login-submit" type="submit">
            Iniciar sesión <span aria-hidden="true">→</span>
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
