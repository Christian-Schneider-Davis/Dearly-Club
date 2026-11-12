import { getDocs } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

/**
 * Runs a Firestore query and returns { rows, loading, error, reload }.
 * `makeQuery` is rebuilt whenever `deps` change.
 */
export default function useQuery(makeQuery, deps = []) {
  const [state, setState] = useState({ rows: [], loading: true, error: null })
  const [tick, setTick] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const build = useCallback(makeQuery, deps)

  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    getDocs(build())
      .then((snap) => live && setState({ rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }))
      .catch((error) => {
        console.error(error)
        if (live) setState({ rows: [], loading: false, error })
      })
    return () => {
      live = false
    }
  }, [build, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload, setRows: (fn) => setState((s) => ({ ...s, rows: fn(s.rows) })) }
}
