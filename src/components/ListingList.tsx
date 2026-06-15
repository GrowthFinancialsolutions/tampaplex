import type { Computed, Listing } from '../types'
import { ListingCard } from './ListingCard'

interface Props {
  items: { listing: Listing; computed: Computed }[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}

export function ListingList({ items, favorites, onToggleFavorite, onOpen }: Props) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-slate-400">No listings match your filters.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ listing, computed }) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          computed={computed}
          isFavorite={favorites.includes(listing.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
