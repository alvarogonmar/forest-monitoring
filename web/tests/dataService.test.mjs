import test from 'node:test'
import assert from 'node:assert/strict'
import { createDataService } from '../src/services/dataService.js'

test('responses are independent copies; editing one does not corrupt future loads', async () => {
  const service = createDataService({ delayMs: 0 })
  const routes = await service.getRoutes()
  const originalLatitude = routes[0].coordinates[0][0]
  routes[0].coordinates[0][0] = 999
  assert.equal((await service.getRoutes())[0].coordinates[0][0], originalLatitude)
})

test('a missing GPS location remains null rather than becoming a fabricated coordinate', async () => {
  const requests = await createDataService({ delayMs: 0 }).getHelpRequests()
  assert.ok(requests.some((request) => request.coordinates === null))
})

test('empty results are successful responses for individual and composite resources', async () => {
  const service = createDataService({ scenario: 'empty', delayMs: 0 })
  assert.deepEqual(await service.getHelpRequests(), [])
  assert.deepEqual(await service.getMapData(), { routes: [], points: [] })
  assert.deepEqual(await service.getCountsData(), { routes: [], counts: [] })
})

test('load failures reject instead of reporting an empty list or zero detections', async () => {
  const service = createDataService({ scenario: 'error', delayMs: 0 })
  await assert.rejects(service.getHelpRequests(), /No se pudieron cargar/)
  await assert.rejects(service.getCountsData(), /No se pudieron cargar/)
})

test('an already-aborted request rejects without waiting for a response', async () => {
  const controller = new AbortController()
  controller.abort()
  const service = createDataService({ delayMs: 60000 })
  await assert.rejects(service.getRoutes({ signal: controller.signal }), { name: 'AbortError' })
})

test('cancelling a pending composite request aborts all of its underlying loads', async () => {
  const controller = new AbortController()
  const service = createDataService({ delayMs: 60000 })
  const rejected = assert.rejects(service.getMapData({ signal: controller.signal }), { name: 'AbortError' })
  controller.abort()
  await rejected
})
