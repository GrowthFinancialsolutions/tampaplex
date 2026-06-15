import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversionCard } from './ConversionCard'
import { computeMetrics } from '../lib/math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { Listing } from '../types'

function makeConversion(): Listing {
  const inputs = { price: 444900, units: 1, rentTotal: 0, taxAnnual: 4894, insuranceAnnual: 4449, hoaMonthly: 0 }
  return {
    id: 'z-chelsea-805',
    address: '805 E Chelsea St, Tampa, FL 33603',
    zip: '33603',
    beds: 3,
    baths: 2,
    sqft: 1428,
    yearBuilt: 1913,
    propertyType: 'Single Family',
    firstSeen: '2026-06-15T00:00:00Z',
    isNew: false,
    rentSource: 'estimated',
    taxSource: 'estimated',
    kind: 'conversion',
    zoning: 'SH-RS',
    lotSqft: 10150,
    conversionNote: 'Single-family on an oversized lot — possible ADU under Tampa rules. Verify with the City of Tampa.',
    ...inputs,
    computed: computeMetrics(inputs, DEFAULT_ASSUMPTIONS),
  } as Listing
}

describe('ConversionCard', () => {
  it('shows the candidate facts, zoning, and conversion note — but no Deal Score', () => {
    render(<ConversionCard listing={makeConversion()} isFavorite={false} onToggleFavorite={() => {}} />)
    expect(screen.getByText(/805 E Chelsea/)).toBeInTheDocument()
    expect(screen.getByText(/Add-a-unit potential/i)).toBeInTheDocument()
    expect(screen.getByText(/SH-RS/)).toBeInTheDocument()
    expect(screen.getAllByText(/City of Tampa/i).length).toBeGreaterThan(0)
  })
})
