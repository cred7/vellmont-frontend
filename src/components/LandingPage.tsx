import type { ApiRow, PublicListing } from '../domain'
import { Marketplace } from './Marketplace'

type LandingPageProps = {
  listings: PublicListing[]
  loading: boolean
  unavailable: boolean
  onRetry: () => void
  onDetails: (listing: ApiRow) => void
  onLead: (listing: ApiRow) => void
  onViewing: (listing: ApiRow) => void
  onOffer: (listing: ApiRow) => void
  onSignIn: () => void
}

export function LandingPage({
  listings,
  loading,
  unavailable,
  onRetry,
  onDetails,
  onLead,
  onViewing,
  onOffer,
  onSignIn,
}: LandingPageProps) {
  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8">
      <section className="grid min-w-0 items-center gap-8 py-10 sm:gap-10 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900">
            <span className="size-2 bg-emerald-600" /> Spaces to settle into
          </p>
          <h1 className="text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl">Find the place<br />that feels like <span className="font-serif italic text-emerald-800">yours.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Thoughtful homes, clear details, and a more personal way to make your next move.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#available-homes" className="bg-emerald-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Explore available homes <span aria-hidden="true">↘</span></a>
            <button onClick={onSignIn} className="border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-500">Manage a property</button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span><strong className="text-slate-900">Direct</strong> landlord enquiries</span>
            <span className="h-5 border-l border-slate-300" />
            <span><strong className="text-slate-900">Simple</strong> viewing requests</span>
          </div>
        </div>
        <div className="relative min-h-[330px] overflow-hidden bg-[#d7e4d7] p-6 sm:min-h-[440px] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_25%,#f6f1e7_0%,transparent_37%),linear-gradient(135deg,#d7e4d7_0%,#9eb69f_100%)]" />
          <div className="absolute -right-10 -top-10 size-64 border border-white/50" />
          <div className="absolute right-8 top-8 size-48 border border-white/50" />
          <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-[linear-gradient(0deg,rgba(28,51,39,0.68),transparent)]" />
          <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-4 text-white sm:bottom-9 sm:left-9 sm:right-9">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">A considered move</p>
              <p className="mt-2 max-w-xs text-2xl font-medium leading-tight sm:text-3xl">Room to live well, wherever you land.</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center border border-white/50 text-xl">↗</span>
          </div>
          <div className="absolute right-6 top-6 border border-white/70 bg-white/80 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vellmont standard</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Home, made personal</p>
          </div>
        </div>
      </section>
      <section id="available-homes" className="scroll-mt-24 border-t border-slate-200 py-12 sm:py-16">
        <Marketplace
          listings={listings}
          loading={loading}
          unavailable={unavailable}
          onRetry={onRetry}
          onDetails={onDetails}
          onLead={onLead}
          onViewing={onViewing}
          onOffer={onOffer}
          onSignIn={onSignIn}
          embedded
        />
      </section>
    </main>
  )
}
