import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { authService } from '../services/authService.js'
import { SessionContext } from './sessionContext.js'

export default function SessionProvider({ children }) {
  const { pathname } = useLocation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const scope = pathname.startsWith('/admin') ? '/admin' : pathname
  const key = `${scope}:${attempt}`
  const revision = useRef(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])

  // Recheck the server cookie after navigation, reload, or returning to the tab.
  useEffect(() => {
    const controller = new AbortController()
    const requestRevision = ++revision.current
    authService.current({ signal: controller.signal }).then(
      session => {
        if (!controller.signal.aborted && revision.current === requestRevision) setResult({ session })
      },
      error => {
        if (!controller.signal.aborted && revision.current === requestRevision) setResult({ error: error.message })
      },
    )
    return () => controller.abort()
  }, [key])

  useEffect(() => {
    window.addEventListener('focus', retry)
    return () => window.removeEventListener('focus', retry)
  }, [retry])

  const login = useCallback(async credentials => {
    const session = await authService.login(credentials)
    revision.current++
    setResult({ session })
  }, [])
  const logout = useCallback(async csrfToken => {
    await authService.logout(csrfToken)
    revision.current++
    setResult({ session: null })
  }, [])
  const value = useMemo(() => ({
    session: result?.session ?? null,
    error: result?.error ?? null,
    checking: result === null,
    retry, login, logout,
  }), [result, retry, login, logout])

  return <SessionContext value={value}>{children}</SessionContext>
}
