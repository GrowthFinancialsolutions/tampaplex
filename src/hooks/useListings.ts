import { useEffect, useState } from 'react'
import type { ListingsFile } from '../types'

export function useListings() {
  const [data, setData] = useState<ListingsFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/listings.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ListingsFile) => setData(d))
      .catch((e) => setError(String(e)))
  }, [])

  return { data, error }
}
