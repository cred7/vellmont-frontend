import { useEffect, useState } from 'react'

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-48 place-items-center border-y border-slate-200 bg-white text-sm text-slate-500">
      <span className="flex items-center gap-3">
        <span className="size-4 animate-spin border-2 border-emerald-800 border-r-transparent" />
        {label}
      </span>
    </div>
  )
}

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 480)
    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  if (!visible) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-20 grid size-11 place-items-center border border-slate-300 bg-white text-lg text-emerald-950 shadow-lg transition hover:border-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-y border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center bg-emerald-50 text-xl text-emerald-900">⌂</span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
    </div>
  )
}
