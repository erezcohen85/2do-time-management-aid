import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The detail panel is driven by the URL so it can open from any screen. */
export function useDetail() {
  const [params, setParams] = useSearchParams()
  const itemId = params.get('item')
  const projectId = params.get('project')

  const set = useCallback(
    (key: 'item' | 'project' | null, id?: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('item')
          next.delete('project')
          if (key && id) next.set(key, id)
          return next
        },
        { replace: false },
      )
    },
    [setParams],
  )

  return {
    itemId,
    projectId,
    openItem: (id: string) => set('item', id),
    openProject: (id: string) => set('project', id),
    close: () => set(null),
  }
}
