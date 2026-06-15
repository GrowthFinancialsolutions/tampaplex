export interface Overrides {
  rentTotal?: number
  insuranceAnnual?: number
  taxAnnual?: number
  units?: number
}

export interface Store {
  favorites: string[]
  notes: Record<string, string>
  overrides: Record<string, Overrides>
}

const KEY = 'tampaplex.v1'

export function emptyStore(): Store {
  return { favorites: [], notes: {}, overrides: {} }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    return { ...emptyStore(), ...(JSON.parse(raw) as Store) }
  } catch {
    return emptyStore()
  }
}

export function saveStore(s: Store): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function toggleFavorite(s: Store, id: string): Store {
  const favorites = s.favorites.includes(id)
    ? s.favorites.filter((f) => f !== id)
    : [...s.favorites, id]
  return { ...s, favorites }
}

export function setNote(s: Store, id: string, note: string): Store {
  return { ...s, notes: { ...s.notes, [id]: note } }
}

export function setOverride(s: Store, id: string, patch: Overrides): Store {
  const merged = { ...(s.overrides[id] ?? {}), ...patch }
  return { ...s, overrides: { ...s.overrides, [id]: merged } }
}
