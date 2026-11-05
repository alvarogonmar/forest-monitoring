import { useEffect, useRef, useState } from 'react'

// The loader must be a stable service function, defined outside a component.
export default function useAsyncData(loader) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const currentRequest = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    currentRequest.current = controller

    Promise.resolve()
      .then(() => loader({ signal: controller.signal }))
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: null })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error })
      })

    return () => controller.abort()
  }, [loader, revision])

  function reload() {
    currentRequest.current?.abort()
    setState({ status: 'loading', data: null, error: null })
    setRevision((value) => value + 1)
  }

  return { ...state, reload }
}
