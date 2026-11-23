import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthService } from '../src/services/authService.js'

const credentials = { email: ' ADMIN@EXAMPLE.TEST ', password: ' password with spaces ' }
const session = {
  user: { id: 'admin-id', email: 'admin@example.test', role: 'admin' },
  expiresAt: '2026-11-24T00:00:00Z', csrfToken: 'test-csrf',
}

test('login sends credentials to Express with cookies and preserves the exact password', async () => {
  const service = createAuthService({ fetchImpl: async (url, options) => {
    assert.equal(url, '/api/auth/login')
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'include')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), { email: 'admin@example.test', password: credentials.password })
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json(session)
  } })
  assert.deepEqual(await service.login(credentials), session)
})

test('denied access, rate limits and outages return safe messages without reflecting response contents', async () => {
  const expected = new Map([[400, /Revisa/], [401, /incorrectos/], [403, /No se permite/],
    [429, /Demasiados intentos/], [503, /no está disponible/], [500, /no está disponible/]])
  for (const [status, message] of expected) {
    const service = createAuthService({ fetchImpl: async () => Response.json({
      error: { message: 'private provider details and password' },
    }, { status }) })
    await assert.rejects(service.login(credentials), error => {
      assert.match(error.message, message)
      assert.ok(!error.message.includes('private provider'))
      return true
    })
  }
})

test('network failures, timeouts and an HTML proxy response never authenticate', async () => {
  for (const fetchImpl of [async () => { throw new TypeError('private network details') },
    async () => { throw new DOMException('timeout', 'TimeoutError') },
    async () => new Response('<html>proxy unavailable</html>')]) {
    await assert.rejects(createAuthService({ fetchImpl }).login(credentials), /No pudimos conectar/)
  }
})

test('malformed success responses do not count as a confirmed session', async () => {
  for (const value of [{}, { ...session, user: { ...session.user, role: 'visitor' } },
    { ...session, csrfToken: null }, { ...session, expiresAt: 'invalid' }]) {
    await assert.rejects(createAuthService({ fetchImpl: async () => Response.json(value) }).login(credentials),
      /No pudimos confirmar/)
  }
})

test('session restoration includes the cookie and only 401 means signed out', async () => {
  let status = 200
  const service = createAuthService({ fetchImpl: async (url, options) => {
    assert.equal(url, '/api/auth/me')
    assert.equal(options.credentials, 'include')
    assert.equal(options.cache, 'no-store')
    return Response.json(status === 200 ? session : {}, { status })
  } })
  assert.deepEqual(await service.current(), session)
  status = 401
  assert.equal(await service.current(), null)
  for (const code of [403, 503]) {
    status = code
    await assert.rejects(service.current())
  }
})

test('logout uses the current CSRF token and accepts server-confirmed revocation or expiry', async () => {
  let status = 204
  const service = createAuthService({ fetchImpl: async (url, options) => {
    assert.equal(url, '/api/auth/logout')
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'include')
    assert.equal(options.headers['X-CSRF-Token'], session.csrfToken)
    return status === 204 ? new Response(null, { status }) : Response.json({}, { status })
  } })
  assert.equal(await service.logout(session.csrfToken), null)
  status = 401
  assert.equal(await service.logout(session.csrfToken), null)
  status = 503
  await assert.rejects(service.logout(session.csrfToken))
})

test('cancelled restoration preserves cancellation for unmounted pages', async () => {
  const controller = new AbortController()
  controller.abort()
  const service = createAuthService({ fetchImpl: async (_url, options) => {
    options.signal.throwIfAborted()
  } })
  await assert.rejects(service.current({ signal: controller.signal }), { name: 'AbortError' })
})
