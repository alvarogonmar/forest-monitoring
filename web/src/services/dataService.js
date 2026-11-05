import { demoRoutes } from '../data/routes.js'
import { demoSensorPoints } from '../data/sensorPoints.js'
import { demoCounts, demoHelpRequests } from '../data/adminDemo.js'

function waitForResponse(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, delayMs)

    function abort() {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

// Replace these methods with authenticated HTTP calls when the API is available.
// Empty responses and request failures remain distinct for every screen.
export function createDataService({ scenario = 'success', delayMs = 300 } = {}) {
  async function read(data, options = {}) {
    await waitForResponse(delayMs, options.signal)
    if (scenario === 'error') throw new Error('No se pudieron cargar los datos. Inténtalo de nuevo.')
    return scenario === 'empty' ? [] : structuredClone(data)
  }

  const getRoutes = (options) => read(demoRoutes, options)
  const getSensorPoints = (options) => read(demoSensorPoints, options)
  const getCounts = (options) => read(
    Object.entries(demoCounts).map(([routeId, count]) => ({ routeId, count })), options,
  )
  const getHelpRequests = (options) => read(demoHelpRequests, options)

  return {
    getRoutes,
    getSensorPoints,
    getCounts,
    getHelpRequests,
    async getMapData(options) {
      const [routes, points] = await Promise.all([getRoutes(options), getSensorPoints(options)])
      return { routes, points }
    },
    async getCountsData(options) {
      const [routes, counts] = await Promise.all([getRoutes(options), getCounts(options)])
      return { routes, counts }
    },
  }
}

const service = createDataService({ scenario: import.meta.env?.VITE_DEMO_SCENARIO || 'success' })

export const { getRoutes, getMapData, getCountsData, getHelpRequests } = service
