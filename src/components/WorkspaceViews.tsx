import type { ApiRow, ResourceKey } from '../domain'
import { formatValue, tableFields, textValue } from '../domain'
import { EmptyState, LoadingState } from './UiStates'

export function Overview({
  rows,
  loading,
  onNavigate,
  onRefresh,
}: {
  rows: Record<string, ApiRow[]>
  loading: boolean
  onNavigate: (resource: ResourceKey) => void
  onRefresh: () => void
}) {
  const stats = [
    { key: 'properties' as const, label: 'Properties', value: rows.properties?.length ?? 0, note: 'In your portfolio' },
    { key: 'listings' as const, label: 'Your listings', value: rows.listings?.filter((row) => row.status === 'active').length ?? 0, note: 'Currently active' },
    { key: 'leads' as const, label: 'New leads', value: rows.leads?.filter((row) => row.status === 'new').length ?? 0, note: 'Ready for follow-up' },
    { key: 'viewings' as const, label: 'Viewings', value: rows.viewings?.filter((row) => row.status === 'requested').length ?? 0, note: 'Awaiting confirmation' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onRefresh} className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Refresh overview</button>
      </div>
      {loading ? <LoadingState label="Loading your portfolio…" /> : (
        <>
          <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <button key={stat.key} onClick={() => onNavigate(stat.key)} className="bg-white p-5 text-left transition hover:bg-emerald-50">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Next steps</p><h2 className="mt-2 text-xl font-semibold">Keep things moving</h2></div>
                <span className="grid size-11 place-items-center bg-emerald-50 text-xl text-emerald-900">↗</span>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <QuickLink icon="＋" title="Add a property" body="Start by adding a place to your portfolio." onClick={() => onNavigate('properties')} />
                <QuickLink icon="◇" title="Create a listing" body="Publish a home to the public marketplace." onClick={() => onNavigate('listings')} />
                <QuickLink icon="◎" title="Review offers" body={`${rows.offers?.filter((row) => row.status === 'pending').length ?? 0} pending offer(s) to review.`} onClick={() => onNavigate('offers')} />
              </div>
            </div>
            <div className="bg-emerald-950 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">A note on visibility</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">Your listings, on your terms.</h2>
              <p className="mt-3 text-sm leading-6 text-emerald-100/80">Drafts and paused homes stay private. Only active listings on active properties can be seen by renters.</p>
              <button onClick={() => onNavigate('listings')} className="mt-6 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100">Manage listings <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function QuickLink({ icon, title, body, onClick }: { icon: string; title: string; body: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-slate-50">
      <span className="grid size-10 shrink-0 place-items-center bg-slate-100 text-emerald-950">{icon}</span>
      <span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-slate-500">{body}</span></span>
      <span className="text-slate-400" aria-hidden="true">→</span>
    </button>
  )
}

export function ResourceTable({
  resource,
  rows,
  filter,
  loading,
  onFilter,
  onRefresh,
  onEdit,
  onDelete,
  onCreateTransaction,
}: {
  resource: ResourceKey
  rows: ApiRow[]
  filter: string
  loading: boolean
  onFilter: (value: string) => void
  onRefresh: () => void
  onEdit: (row: ApiRow) => void
  onDelete: (row: ApiRow) => void
  onCreateTransaction: (offer: ApiRow) => void
}) {
  const columns = tableFields[resource] ?? []
  const supportsDelete = ['properties', 'units', 'listings', 'viewings', 'tenants'].includes(resource)
  return (
    <div className="min-w-0 overflow-hidden border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <label className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
          <span className="sr-only">Search {resource}</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
          <input value={filter} onChange={(event) => onFilter(event.target.value)} placeholder={`Search ${resource}…`} className="w-full border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <button onClick={onRefresh} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Refresh</button>
      </div>
      {loading ? <LoadingState label={`Loading ${resource}…`} /> : rows.length === 0 ? (
        <EmptyState title={`No ${resource} yet`} body={resource === 'leads' ? 'Public enquiries for your active listings will show up here.' : 'Create or publish your first item to get started.'} />
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>{columns.map(([key, label]) => <th key={key} className="px-5 py-3 font-semibold">{label}</th>)}<th className="px-5 py-3 text-right font-semibold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={textValue(row.id) || index} className="transition hover:bg-slate-50/70">
                    {columns.map(([key]) => <td key={key} className="max-w-[220px] truncate px-5 py-4 text-slate-700">{key === 'status' ? <StatusPill value={textValue(row[key])} /> : formatValue(row[key], key)}</td>)}
                    <td className="px-5 py-4">
                      <RowActions resource={resource} row={row} supportsDelete={supportsDelete} onEdit={onEdit} onDelete={onDelete} onCreateTransaction={onCreateTransaction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 xl:hidden">
            {rows.map((row, index) => (
              <article key={textValue(row.id) || index} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{textValue(row.name || row.full_name || row.unit_number || row.contact_name) || resource.slice(0, -1)}</h3><p className="mt-1 break-all text-xs text-slate-500">{textValue(row.email || row.address_line1 || row.id)}</p></div>
                  {row.status !== undefined && <StatusPill value={textValue(row.status)} />}
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  {columns.filter(([key]) => !['name', 'full_name', 'unit_number', 'contact_name', 'status'].includes(key)).slice(0, 4).map(([key, label]) => <div key={key}><dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-0.5 truncate text-xs text-slate-700">{formatValue(row[key], key)}</dd></div>)}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <RowActions resource={resource} row={row} supportsDelete={supportsDelete} onEdit={onEdit} onDelete={onDelete} onCreateTransaction={onCreateTransaction} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{rows.length} {rows.length === 1 ? 'record' : 'records'} shown</div>
    </div>
  )
}

function RowActions({
  resource,
  row,
  supportsDelete,
  onEdit,
  onDelete,
  onCreateTransaction,
}: {
  resource: ResourceKey
  row: ApiRow
  supportsDelete: boolean
  onEdit: (row: ApiRow) => void
  onDelete: (row: ApiRow) => void
  onCreateTransaction: (offer: ApiRow) => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {resource === 'offers' && row.status === 'accepted' && <button onClick={() => onCreateTransaction(row)} className="bg-emerald-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">Start rental</button>}
      <button onClick={() => onEdit(row)} className="border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-900">Update</button>
      {supportsDelete && <button onClick={() => onDelete(row)} className="border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-700">{resource === 'viewings' || resource === 'tenants' ? 'Close' : 'Archive'}</button>}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const isPositive = ['active', 'accepted', 'completed', 'qualified', 'converted'].includes(value.toLowerCase())
  const isNegative = ['closed', 'cancelled', 'lost', 'rejected', 'terminated'].includes(value.toLowerCase())
  return <span className={`inline-flex px-2.5 py-1 text-[10px] font-semibold capitalize ${isPositive ? 'bg-emerald-100 text-emerald-900' : isNegative ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900'}`}>{value || 'unknown'}</span>
}

export function ProfileCard({ profile, loading, onEdit }: { profile?: ApiRow; loading: boolean; onEdit: () => void }) {
  if (loading) return <LoadingState label="Loading your profile…" />
  if (!profile) return <EmptyState title="Profile unavailable" body="Refresh this section to load your landlord profile." />
  return (
    <div className="max-w-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center bg-emerald-950 text-xl font-semibold text-white">{textValue(profile.full_name).slice(0, 1) || 'V'}</span>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Landlord account</p><h2 className="mt-1 text-xl font-semibold">{textValue(profile.full_name) || 'Your profile'}</h2></div>
      </div>
      <dl className="mt-7 divide-y divide-slate-100">
        <ProfileField label="Full name" value={textValue(profile.full_name)} />
        <ProfileField label="Phone" value={textValue(profile.phone)} />
        <ProfileField label="Email" value={textValue(profile.email)} />
      </dl>
      <button onClick={onEdit} className="mt-6 bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Edit profile</button>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-2 py-4"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium text-slate-900">{value || 'Not provided'}</dd></div>
}
