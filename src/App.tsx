import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiRequest, isBackendUnavailable } from './api'
import { FormDialog, ListingDetails } from './components/Dialogs'
import { LandingPage } from './components/LandingPage'
import { Marketplace } from './components/Marketplace'
import { Overview, ProfileCard, ResourceTable } from './components/WorkspaceViews'
import { ScrollToTop } from './components/UiStates'
import {
  availableUnitOptionsFromRows,
  asPublicListings,
  asRows,
  createEndpoints,
  endpoints,
  errorMessage,
  fieldsFor,
  isRecord,
  navigation,
  propertyOptionsFromRows,
  textValue,
  unitOptionsFromRows,
  type ApiRow,
  type AuthResponse,
  type FieldSpec,
  type FormModel,
  type FormValues,
  type PublicListing,
  type ResourceKey,
  type User,
} from './domain'

const resourceTitles: Record<ResourceKey, string> = {
  overview: 'Your portfolio at a glance',
  marketplace: 'Available homes',
  properties: 'Properties',
  units: 'Units',
  listings: 'Listings',
  leads: 'Leads',
  viewings: 'Viewing requests',
  offers: 'Offers',
  tenants: 'Tenants',
  transactions: 'Transactions',
  profile: 'Landlord profile',
}

const resourceDescriptions: Record<ResourceKey, string> = {
  overview: 'A clear view of your homes, active listings, and the people interested in them.',
  marketplace: 'Browse the active homes and apartments currently available to rent.',
  properties: 'Manage the rental properties owned by your landlord account.',
  units: 'Keep unit availability, rent, and property relationships up to date.',
  listings: 'Create draft listings and publish or pause them as availability changes.',
  leads: 'Follow up with people who have enquired about your active listings.',
  viewings: 'Coordinate requested viewings and keep each prospect informed.',
  offers: 'Review offers submitted for your active rental listings.',
  tenants: 'Manage tenants attached to properties in your portfolio.',
  transactions: 'Track a rental transaction from accepted offer to completion.',
  profile: 'Keep the name and phone number for your landlord profile current.',
}

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem('vellmont_token') ?? '')
  const [user, setUser] = useState<User | null>(null)
  const [active, setActive] = useState<ResourceKey>('marketplace')
  const [rows, setRows] = useState<Record<string, ApiRow[]>>({})
  const [publicListings, setPublicListings] = useState<PublicListing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backendUnavailable, setBackendUnavailable] = useState(false)
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState<FormModel | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)
  const [selectedListing, setSelectedListing] = useState<ApiRow | null>(null)

  useEffect(() => {
    if (token) window.localStorage.setItem('vellmont_token', token)
    else window.localStorage.removeItem('vellmont_token')
  }, [token])

  const reportError = useCallback((requestError: unknown) => {
    if (isBackendUnavailable(requestError)) {
      setBackendUnavailable(true)
      setError('')
      return
    }
    setBackendUnavailable(false)
    setError(errorMessage(requestError))
  }, [])

  const loadResource = useCallback(async (resource: ResourceKey) => {
    if (resource === 'marketplace') {
      setLoading(true)
      setError('')
      try {
        const result = await apiRequest<unknown>('/listings')
        setPublicListings(asPublicListings(result))
        setBackendUnavailable(false)
      } catch (loadError) {
        if (isBackendUnavailable(loadError)) {
          setBackendUnavailable(true)
          setPublicListings([])
        } else {
          reportError(loadError)
        }
      } finally {
        setLoading(false)
      }
      return
    }

    if (!token) return
    setLoading(true)
    setError('')
    try {
      if (resource === 'overview') {
        const [properties, listings, leads, viewings, offers] = await Promise.all([
          apiRequest<unknown>('/properties', { token }),
          apiRequest<unknown>('/listings/mine', { token }),
          apiRequest<unknown>('/leads', { token }),
          apiRequest<unknown>('/viewings', { token }),
          apiRequest<unknown>('/offers', { token }),
        ])
        setRows({
          properties: asRows(properties),
          listings: asRows(listings),
          leads: asRows(leads),
          viewings: asRows(viewings),
          offers: asRows(offers),
        })
        setBackendUnavailable(false)
      } else if (resource === 'profile') {
        const result = await apiRequest<unknown>('/landlords/me', { token })
        if (!isRecord(result)) throw new Error('The landlord profile API returned an invalid response.')
        setRows((current) => ({ ...current, profile: [result] }))
        setBackendUnavailable(false)
      } else if (resource === 'units') {
        const [unitResponse, propertyResponse] = await Promise.all([
          apiRequest<unknown>('/units', { token }),
          apiRequest<unknown>('/properties', { token }),
        ])
        const propertyNames = new Map(
          propertyOptionsFromRows(asRows(propertyResponse)).map(({ value, label }) => [value, label]),
        )
        const units = asRows(unitResponse).map((unit) => {
          const propertyName = propertyNames.get(textValue(unit.property_id))
          if (!propertyName) throw new Error('A unit refers to a property that is missing from the properties response.')
          return { ...unit, property_name: propertyName }
        })
        setRows((current) => ({ ...current, units }))
        setBackendUnavailable(false)
      } else {
        const endpoint = endpoints[resource]
        if (!endpoint) throw new Error('This section is not available.')
        const result = await apiRequest<unknown>(endpoint, { token })
        setRows((current) => ({ ...current, [resource]: asRows(result) }))
        setBackendUnavailable(false)
      }
    } catch (loadError) {
      reportError(loadError)
      if (loadError instanceof ApiError && loadError.status === 401) {
        setToken('')
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [reportError, token])

  useEffect(() => {
    if (!token) return
    void apiRequest<User>('/auth/me', { token })
      .then((profile) => {
        if (profile) {
          setUser(profile)
          setBackendUnavailable(false)
        }
      })
      .catch((profileError: unknown) => {
        reportError(profileError)
        if (profileError instanceof ApiError && profileError.status === 401) {
          setToken('')
          setUser(null)
        }
      })
  }, [reportError, token])

  useEffect(() => {
    if (active === 'marketplace' || token) {
      void Promise.resolve().then(() => loadResource(active))
    }
  }, [active, token, loadResource])

  const filteredRows = useMemo(() => {
    const currentRows = rows[active] ?? []
    const query = filter.trim().toLowerCase()
    if (!query) return currentRows
    return currentRows.filter((row) =>
      Object.values(row).some((value) => textValue(value).toLowerCase().includes(query)),
    )
  }, [active, filter, rows])

  async function handleAuth(values: FormValues) {
    const isRegister = authMode === 'register'
    const response = await apiRequest<AuthResponse>(`/auth/${isRegister ? 'register' : 'login'}`, {
      method: 'POST',
      body: isRegister ? { ...values, role: 'landlord' } : values,
    })
    if (!response?.token || !response.user) {
      throw new Error('The server did not return a valid login session.')
    }
    setToken(response.token)
    setUser(response.user)
    setActive('overview')
    setAuthMode(null)
    setNotice(isRegister ? 'Your landlord account is ready.' : 'Welcome back.')
    setError('')
    setBackendUnavailable(false)
  }

  async function openCreateForm(resource: ResourceKey) {
    if (resource === 'profile') {
      setForm({
        title: 'Update your profile',
        submitLabel: 'Save profile',
        fields: [
          { key: 'full_name', label: 'Full name', type: 'text' },
          { key: 'phone', label: 'Phone', type: 'text' },
        ],
        initialValues: rows.profile?.[0],
        onSubmit: async (values) => {
          await apiRequest('/landlords/me', { token, method: 'PATCH', body: values })
          setNotice('Profile updated.')
          await loadResource('profile')
        },
      })
      return
    }

    if (!['properties', 'units', 'listings', 'tenants', 'transactions'].includes(resource)) return
    let choices: { properties?: ReturnType<typeof propertyOptionsFromRows>; units?: ReturnType<typeof unitOptionsFromRows> } = {}
    if (resource === 'units' || resource === 'tenants' || resource === 'listings') {
      try {
        const propertiesRequest = apiRequest<unknown>('/properties', { token })
        const unitsRequest = resource === 'tenants' || resource === 'listings'
          ? apiRequest<unknown>('/units', { token })
          : Promise.resolve(undefined)
        const [propertyResponse, unitResponse] = await Promise.all([propertiesRequest, unitsRequest])
        const unitRows = resource === 'tenants' || resource === 'listings' ? asRows(unitResponse) : []
        choices = {
          properties: propertyOptionsFromRows(asRows(propertyResponse)),
          ...(resource === 'tenants' ? { units: unitOptionsFromRows(unitRows) } : {}),
          ...(resource === 'listings' ? { units: availableUnitOptionsFromRows(unitRows) } : {}),
        }
      } catch (choiceError) {
        reportError(choiceError)
        return
      }
    }
    setForm({
      title: `Add ${resource === 'transactions' ? 'transaction' : resource.slice(0, -1)}`,
      submitLabel: 'Create',
      fields: fieldsFor(resource, 'create', choices),
      onSubmit: async (values) => {
        const endpoint = createEndpoints[resource] ?? endpoints[resource]
        if (!endpoint) throw new Error('This section is not available.')
        await apiRequest(endpoint, { token, method: 'POST', body: values })
        setNotice(`${resource.slice(0, -1)} created.`)
        await loadResource(resource)
      },
    })
  }

  function openEditForm(resource: ResourceKey, row: ApiRow) {
    if (resource === 'profile') {
      openCreateForm('profile')
      return
    }
    const id = textValue(row.id)
    const path = resource === 'properties'
      ? `/properties/${encodeURIComponent(textValue(row.slug))}`
      : `/${resource}/${encodeURIComponent(id)}`
    setForm({
      title: `Update ${resource.slice(0, -1)}`,
      submitLabel: 'Save changes',
      fields: fieldsFor(resource, 'edit'),
      initialValues: row,
      onSubmit: async (values) => {
        await apiRequest(path, { token, method: 'PATCH', body: values })
        setNotice(`${resource.slice(0, -1)} updated.`)
        await loadResource(resource)
      },
    })
  }

  async function removeRow(resource: ResourceKey, row: ApiRow) {
    const label = textValue(row.name || row.unit_number || row.id)
    if (!window.confirm(`Archive or remove ${label}?`)) return
    const id = textValue(row.id)
    const path = resource === 'properties'
      ? `/properties/${encodeURIComponent(textValue(row.slug))}`
      : `/${resource}/${encodeURIComponent(id)}`
    try {
      await apiRequest(path, { token, method: 'DELETE' })
      setNotice(`${resource.slice(0, -1)} removed.`)
      await loadResource(resource)
    } catch (removeError) {
      reportError(removeError)
    }
  }

  function openPublicForm(listing: ApiRow, kind: 'lead' | 'viewing' | 'offer') {
    const listingId = textValue(listing.id)
    const common: FieldSpec[] = [
      { key: 'contact_name', label: 'Your name', type: 'text', required: true },
      { key: 'contact_email', label: 'Email', type: 'email', required: true },
      { key: 'contact_phone', label: 'Phone (optional)', type: 'text' },
    ]
    const leadFields: FieldSpec[] = [
      { key: 'name', label: 'Your name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone (optional)', type: 'text' },
      { key: 'source', label: 'How did you find us?', type: 'text', defaultValue: 'website' },
    ]
    const fields = kind === 'lead'
      ? leadFields
      : kind === 'viewing'
        ? [...common, { key: 'scheduled_at', label: 'Preferred viewing time', type: 'datetime-local' as const, required: true }, { key: 'notes', label: 'Notes (optional)', type: 'textarea' as const }]
        : [...common, { key: 'amount', label: 'Offer amount', type: 'number' as const, required: true, step: '0.01' }, { key: 'message', label: 'Message (optional)', type: 'textarea' as const }]
    const endpoint = kind === 'lead' ? '/leads' : kind === 'viewing' ? '/viewings' : '/offers'
    const bodyValues = (values: FormValues) => {
      const normalized: FormValues = { ...values, listing_id: listingId }
      if (kind === 'viewing' && values.scheduled_at) {
        normalized.scheduled_at = new Date(values.scheduled_at).toISOString()
      }
      if (kind === 'lead') {
        normalized.name = values.name
        normalized.email = values.email
      }
      return normalized
    }
    setForm({
      title: kind === 'lead' ? 'Contact about this home' : kind === 'viewing' ? 'Request a viewing' : 'Make an offer',
      description: 'Your details will be shared with the property manager.',
      submitLabel: kind === 'lead' ? 'Send enquiry' : kind === 'viewing' ? 'Request viewing' : 'Submit offer',
      fields,
      onSubmit: async (values) => {
        await apiRequest(endpoint, { method: 'POST', body: bodyValues(values) })
        setNotice(kind === 'lead' ? 'Your enquiry has been sent.' : kind === 'viewing' ? 'Your viewing request has been sent.' : 'Your offer has been submitted.')
      },
    })
  }

  async function openListingDetails(listing: ApiRow) {
    try {
      const details = await apiRequest<ApiRow>(`/listings/${encodeURIComponent(textValue(listing.id))}`)
      setSelectedListing(details ?? listing)
    } catch (detailsError) {
      reportError(detailsError)
    }
  }

  function createTransactionFromOffer(offer: ApiRow) {
    setForm({
      title: 'Start a rental transaction',
      description: 'Transactions only record the rental workflow; they do not process payments.',
      submitLabel: 'Create transaction',
      fields: fieldsFor('transactions', 'create'),
      initialValues: { offer_id: offer.id },
      onSubmit: async (values) => {
        await apiRequest('/transactions', { token, method: 'POST', body: values })
        setNotice('Rental transaction created.')
        await loadResource('transactions')
      },
    })
  }

  function signOut() {
    setToken('')
    setUser(null)
    setRows({})
    setActive('marketplace')
    setNotice('You have signed out.')
  }

  function navigateTo(resource: ResourceKey) {
    setActive(resource)
    setFilter('')
    setError('')
    setNotice('')
  }

  const unavailableNotice = backendUnavailable && user

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => navigateTo(user ? 'overview' : 'marketplace')}>
            <span className="grid size-10 place-items-center bg-emerald-950 text-sm font-bold tracking-wide text-white">V</span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">vellmont</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Living, considered</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">A better way to find home.</span>
            {user ? (
              <button className="border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:border-slate-400" onClick={signOut}>Sign out</button>
            ) : (
              <>
                <button className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => setAuthMode('login')}>Log in</button>
                <button className="bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800" onClick={() => setAuthMode('register')}>List your property</button>
              </>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 flex max-w-[1440px] flex-col gap-2 px-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-8" role="alert">
          <p className="w-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          <button className="self-end text-sm font-semibold text-rose-800 sm:pt-2" onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button>
        </div>
      )}
      {unavailableNotice && (
        <div className="mx-auto mt-4 max-w-[1440px] border-l-4 border-amber-500 bg-amber-50 px-5 py-3 text-sm text-amber-950 sm:px-8" role="status">
          Vellmont is temporarily unavailable. Check your connection and try again shortly.
        </div>
      )}
      {notice && (
        <div className="mx-auto mt-4 flex max-w-[1440px] flex-col gap-2 px-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-8" role="status">
          <p className="w-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>
          <button className="self-end text-sm font-semibold text-emerald-900 sm:pt-2" onClick={() => setNotice('')} aria-label="Dismiss notification">Dismiss</button>
        </div>
      )}

      {user ? (
        <Workspace
          user={user}
          active={active}
          rows={rows}
          filteredRows={filteredRows}
          loading={loading}
          filter={filter}
          onNavigate={navigateTo}
          onFilter={setFilter}
          onCreate={() => openCreateForm(active)}
          onRefresh={() => void loadResource(active)}
          onEdit={(row) => openEditForm(active, row)}
          onDelete={(row) => void removeRow(active, row)}
          onCreateTransaction={createTransactionFromOffer}
          onProfileEdit={() => openCreateForm('profile')}
          publicListings={publicListings}
          marketplaceLoading={loading && active === 'marketplace'}
          marketUnavailable={backendUnavailable}
          onRetryMarketplace={() => void loadResource('marketplace')}
          onDetails={openListingDetails}
          onPublicLead={(listing) => openPublicForm(listing, 'lead')}
          onPublicViewing={(listing) => openPublicForm(listing, 'viewing')}
          onPublicOffer={(listing) => openPublicForm(listing, 'offer')}
          onPublicSignIn={() => setAuthMode('register')}
        />
      ) : (
        <LandingPage
          listings={publicListings}
          loading={loading}
          unavailable={backendUnavailable}
          onRetry={() => void loadResource('marketplace')}
          onDetails={openListingDetails}
          onLead={(listing) => openPublicForm(listing, 'lead')}
          onViewing={(listing) => openPublicForm(listing, 'viewing')}
          onOffer={(listing) => openPublicForm(listing, 'offer')}
          onSignIn={() => setAuthMode('register')}
        />
      )}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-slate-500 sm:px-8">
          <span>© {new Date().getFullYear()} Vellmont. Find a place to belong.</span>
          <span>Residential rentals, made more human.</span>
        </div>
      </footer>

      {authMode && (
        <FormDialog
          key={authMode}
          model={{
            title: authMode === 'login' ? 'Welcome back' : 'Create your landlord account',
            description: authMode === 'login' ? 'Sign in to manage your rentals and enquiries.' : 'Create an account to list and manage your properties.',
            submitLabel: authMode === 'login' ? 'Log in' : 'Create account',
            fields: authMode === 'login'
              ? [
                  { key: 'email', label: 'Email', type: 'email', required: true },
                  { key: 'password', label: 'Password', type: 'password', required: true },
                ]
              : [
                  { key: 'full_name', label: 'Full name', type: 'text', required: true },
                  { key: 'email', label: 'Email', type: 'email', required: true },
                  { key: 'password', label: 'Password (at least 8 characters)', type: 'password', required: true },
                ],
            onSubmit: handleAuth,
          }}
          busy={formBusy}
          onBusy={setFormBusy}
          onClose={() => setAuthMode(null)}
          footer={<button type="button" className="text-sm font-semibold text-emerald-900 underline underline-offset-4" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create a landlord account' : 'Already have an account? Log in'}</button>}
        />
      )}

      {form && <FormDialog key={form.title} model={form} busy={formBusy} onBusy={setFormBusy} onClose={() => setForm(null)} />}
      {selectedListing && (
        <ListingDetails
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onLead={() => { setSelectedListing(null); openPublicForm(selectedListing, 'lead') }}
          onViewing={() => { setSelectedListing(null); openPublicForm(selectedListing, 'viewing') }}
          onOffer={() => { setSelectedListing(null); openPublicForm(selectedListing, 'offer') }}
        />
      )}
      <ScrollToTop />
    </div>
  )
}

function Workspace({
  user,
  active,
  rows,
  filteredRows,
  loading,
  filter,
  onNavigate,
  onFilter,
  onCreate,
  onRefresh,
  onEdit,
  onDelete,
  onCreateTransaction,
  onProfileEdit,
  publicListings,
  marketplaceLoading,
  marketUnavailable,
  onRetryMarketplace,
  onDetails,
  onPublicLead,
  onPublicViewing,
  onPublicOffer,
  onPublicSignIn,
}: {
  user: User
  active: ResourceKey
  rows: Record<string, ApiRow[]>
  filteredRows: ApiRow[]
  loading: boolean
  filter: string
  onNavigate: (resource: ResourceKey) => void
  onFilter: (value: string) => void
  onCreate: () => void
  onRefresh: () => void
  onEdit: (row: ApiRow) => void
  onDelete: (row: ApiRow) => void
  onCreateTransaction: (offer: ApiRow) => void
  onProfileEdit: () => void
  publicListings: PublicListing[]
  marketplaceLoading: boolean
  marketUnavailable: boolean
  onRetryMarketplace: () => void
  onDetails: (listing: ApiRow) => void
  onPublicLead: (listing: ApiRow) => void
  onPublicViewing: (listing: ApiRow) => void
  onPublicOffer: (listing: ApiRow) => void
  onPublicSignIn: () => void
}) {
  const canCreate = ['properties', 'units', 'listings', 'tenants', 'transactions', 'profile'].includes(active)
  return (
    <div className="mx-auto grid min-w-0 max-w-[1440px] gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <div className="mb-5 bg-emerald-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Workspace</p>
          <p className="mt-2 truncate font-semibold">{user.full_name || user.email}</p>
          <p className="mt-1 text-xs text-emerald-200">Landlord account</p>
        </div>
        <nav className="workspace-nav flex snap-x gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-y-auto" aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex snap-start shrink-0 items-center gap-3 px-3 py-2.5 text-sm font-medium transition lg:w-full ${active === item.key ? 'bg-emerald-100 text-emerald-950' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
            >
              <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-8 hidden border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 lg:block">
          Your data is private to your landlord account. Vellmont only shows public listings that are active.
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4 sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Vellmont workspace</p>
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{resourceTitles[active]}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{resourceDescriptions[active]}</p>
          </div>
          {canCreate && (
            <button onClick={active === 'profile' ? onProfileEdit : onCreate} className="w-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto">
              {active === 'profile' ? 'Edit profile' : `Add ${active.slice(0, -1)}`}
            </button>
          )}
        </div>

        {active === 'overview' ? (
          <Overview rows={rows} loading={loading} onNavigate={onNavigate} onRefresh={onRefresh} />
        ) : active === 'profile' ? (
          <ProfileCard profile={rows.profile?.[0]} loading={loading} onEdit={onProfileEdit} />
        ) : active === 'marketplace' ? (
          <Marketplace
            listings={publicListings}
            loading={marketplaceLoading}
            unavailable={marketUnavailable}
            onRetry={onRetryMarketplace}
            onDetails={onDetails}
            onLead={onPublicLead}
            onViewing={onPublicViewing}
            onOffer={onPublicOffer}
            onSignIn={onPublicSignIn}
          />
        ) : (
          <ResourceTable
            resource={active}
            rows={filteredRows}
            filter={filter}
            loading={loading}
            onFilter={onFilter}
            onRefresh={onRefresh}
            onEdit={onEdit}
            onDelete={onDelete}
            onCreateTransaction={onCreateTransaction}
          />
        )}
      </main>
    </div>
  )
}

export default App
