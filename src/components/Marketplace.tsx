import type { ApiRow, PublicListing } from '../domain'
import { formatValue } from '../domain'
import { EmptyState, LoadingState } from './UiStates'

type MarketplaceProps = {
  listings: PublicListing[]
  loading: boolean
  unavailable?: boolean
  onRetry?: () => void
  onDetails: (listing: ApiRow) => void
  onLead: (listing: ApiRow) => void
  onViewing: (listing: ApiRow) => void
  onOffer: (listing: ApiRow) => void
  onSignIn: () => void
  embedded?: boolean
}

export function Marketplace({
  listings,
  loading,
  unavailable = false,
  onRetry,
  onDetails,
  onLead,
  onViewing,
  onOffer,
  onSignIn,
  embedded = false,
}: MarketplaceProps) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{embedded ? 'The Vellmont collection' : 'Public marketplace'}</p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{embedded ? 'Find your next address' : 'Available homes'}</h2>
          <p className="mt-2 text-sm text-slate-500">{listings.length} {listings.length === 1 ? 'home' : 'homes'} currently listed</p>
        </div>
        {embedded && <button className="text-sm font-semibold text-emerald-900 underline underline-offset-4" onClick={onSignIn}>Are you a landlord? Get started</button>}
      </div>
      {loading ? (
        <LoadingState label="Loading available homes…" />
      ) : unavailable ? (
        <div className="border-y border-slate-200 bg-white px-6 py-10 text-center sm:py-12">
          <span className="mx-auto grid size-12 place-items-center bg-emerald-50 text-xl text-emerald-900" aria-hidden="true">⌂</span>
          <h3 className="mt-4 font-semibold">Homes will be back soon</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            We can’t load available homes right now. Please try again in a little while.
          </p>
          {onRetry && (
            <button onClick={onRetry} className="mt-5 border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-900">
              Try again
            </button>
          )}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState title="No active homes just yet" body="New homes will appear here as soon as a landlord publishes a listing." />
      ) : (
        <div className="grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing, index) => (
            <article key={listing.id} className="overflow-hidden bg-white transition hover:shadow-lg">
              <div className={`relative grid h-48 place-items-center overflow-hidden ${index % 3 === 0 ? 'bg-[#dce7de]' : index % 3 === 1 ? 'bg-[#e7e2d7]' : 'bg-[#dfe7e9]'}`}>
                <div className="absolute inset-0 opacity-60" style={{ background: index % 3 === 0 ? 'radial-gradient(circle at 70% 30%, #fff 0, transparent 38%), linear-gradient(140deg,#c9ddcf,#90ad98)' : index % 3 === 1 ? 'radial-gradient(circle at 65% 28%, #fff 0, transparent 40%), linear-gradient(140deg,#e9e2d3,#b6b6a0)' : 'radial-gradient(circle at 72% 25%, #fff 0, transparent 38%), linear-gradient(140deg,#d9e6e9,#9ab9bd)' }} />
                <span className="relative text-4xl font-serif italic text-white/90">{listing.unit_number || 'V'}</span>
                <span className="absolute left-4 top-4 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-950">Available now</span>
              </div>
              <div className="p-5">
                <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-semibold">{listing.property_name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{listing.unit_number ? `Unit ${listing.unit_number} · ` : ''}{listing.property_slug}</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-950 md:whitespace-nowrap md:text-right">{formatValue(listing.asking_price, 'asking_price')}<span className="text-xs font-normal text-slate-500"> / mo</span></p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button className="bg-emerald-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800" onClick={() => onDetails(listing)}>View home details</button>
                  <button className="border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400" onClick={() => onLead(listing)}>Enquire</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="flex-1 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50" onClick={() => onViewing(listing)}>Request a viewing</button>
                  <button className="flex-1 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50" onClick={() => onOffer(listing)}>Make an offer</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
