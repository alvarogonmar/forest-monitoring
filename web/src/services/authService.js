const messages = {
  400: 'Revisa tu correo y contraseña.',
  401: 'Correo o contraseña incorrectos.',
  403: 'No se permite el acceso. Contacta al administrador.',
  429: 'Demasiados intentos de acceso. Espera antes de volver a intentar.',
}

export function createAuthService({ fetchImpl = globalThis.fetch } = {}) {
  async function request(path, { signal, allowSignedOut = false, ...options } = {}) {
    let response
    let session
    try {
      response = await fetchImpl(`/api/auth/${path}`, {
        ...options,
        credentials: 'include',
        cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
      })
      if (allowSignedOut && response.status === 401) return null
      if (response.status === 204 && response.ok) return null
      // Do not display provider messages, response bodies or credentials in errors.
      if (response.ok) session = await response.json()
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error('No pudimos conectar con el servidor. Comprueba tu conexión e intenta de nuevo.', { cause: error })
    }
    if (!response.ok) {
      throw new Error(messages[response.status] ?? 'El acceso no está disponible. Intenta de nuevo más tarde.')
    }
    if (session?.user?.role !== 'admin' || typeof session.user.id !== 'string'
      || typeof session.user.email !== 'string' || typeof session.csrfToken !== 'string'
      || !Number.isFinite(Date.parse(session.expiresAt))) {
      throw new Error('No pudimos confirmar la sesión. Intenta de nuevo.')
    }
    return session
  }

  return {
    login({ email, password }) {
      return request('login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
    },
    current({ signal } = {}) {
      return request('me', { signal, allowSignedOut: true })
    },
    logout(csrfToken) {
      return request('logout', {
        method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, allowSignedOut: true,
      })
    },
  }
}

// The browser manages the HttpOnly cookie; never save credentials or tokens in storage.
export const authService = createAuthService()
