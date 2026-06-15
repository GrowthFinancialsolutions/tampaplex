import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStore,
  saveStore,
  toggleFavorite,
  setOverride,
  emptyStore,
  setMode,
  setOnboarded,
} from './favorites'

beforeEach(() => localStorage.clear())

describe('favorites store', () => {
  it('returns an empty store when nothing is saved', () => {
    expect(loadStore()).toEqual(emptyStore())
  })

  it('toggles a favorite on and off', () => {
    let s = toggleFavorite(emptyStore(), 's1')
    expect(s.favorites).toContain('s1')
    s = toggleFavorite(s, 's1')
    expect(s.favorites).not.toContain('s1')
  })

  it('stores a per-listing override and persists across load/save', () => {
    const s = setOverride(emptyStore(), 's2', { rentTotal: 4000 })
    saveStore(s)
    const loaded = loadStore()
    expect(loaded.overrides['s2'].rentTotal).toBe(4000)
  })
})

describe('mode + onboarding', () => {
  it('defaults to simple mode and not onboarded', () => {
    const s = emptyStore()
    expect(s.mode).toBe('simple')
    expect(s.onboarded).toBe(false)
  })
  it('updates mode and onboarded immutably', () => {
    const s = emptyStore()
    expect(setMode(s, 'pro').mode).toBe('pro')
    expect(setOnboarded(s, true).onboarded).toBe(true)
    expect(s.mode).toBe('simple') // original unchanged
  })
})
