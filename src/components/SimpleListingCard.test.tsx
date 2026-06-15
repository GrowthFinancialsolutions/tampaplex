import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleListingCard } from './SimpleListingCard'
import { computeMetrics } from '../lib/math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { Listing } from '../types'

function makeListing(): Listing {
  const inputs = {
    price: 720000,
    units: 4,
    rentTotal: 7600,
    taxAnnual: 7920,
    insuranceAnnual: 7200,
    hoaMonthly: 0,
  }
  return {
    id: 's3',
    address: '809 E Frierson Ave, Tampa, FL',
    zip: '33603',
    beds: 8,
    baths: 4,
    sqft: 3400,
    propertyType: 'Multi-Family',
    firstSeen: '2026-06-15T00:00:00Z',
    isNew: true,
    rentSource: 'rentcast',
    taxSource: 'estimated',
    floodZone: { zone: 'AE', risk: 'high' },
    ...inputs,
    computed: computeMetrics(inputs, DEFAULT_ASSUMPTIONS),
  } as Listing
}

describe('SimpleListingCard', () => {
  it('shows address, a verdict sentence, and the flood flag', () => {
    const listing = makeListing()
    render(
      <SimpleListingCard
        listing={listing}
        computed={listing.computed}
        isFavorite={false}
        onToggleFavorite={() => {}}
        onOpen={() => {}}
      />,
    )
    expect(screen.getByText(/Frierson/)).toBeInTheDocument()
    expect(screen.getByText(/cover/i)).toBeInTheDocument()
    expect(screen.getByText(/flood zone/i)).toBeInTheDocument()
  })
})
