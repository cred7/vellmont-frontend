export type ApiRow = Record<string, unknown>

export type ResourceKey =
  | 'overview'
  | 'properties'
  | 'units'
  | 'listings'
  | 'leads'
  | 'viewings'
  | 'offers'
  | 'tenants'
  | 'transactions'
  | 'profile'
  | 'marketplace'

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'select'
  | 'textarea'
  | 'hidden'

export type FieldSpec = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: (string | SelectOption)[]
  dependsOn?: string
  emptyOptionLabel?: string
  defaultValue?: string
  step?: string
  hint?: string
}

export type SelectOption = {
  value: string
  label: string
  parentValue?: string
}

export type FormModel = {
  title: string
  description?: string
  submitLabel: string
  fields: FieldSpec[]
  initialValues?: Record<string, unknown>
  onSubmit: (values: FormValues) => Promise<void>
}

export type FormValue = string | number
export type FormValues = Record<string, FormValue>

export type User = {
  id?: string
  user_id?: string
  email: string
  full_name?: string | null
  role?: string
}

export type AuthResponse = {
  token: string
  user: User
}

export type PublicListing = ApiRow & {
  id: string
  property_name: string
  property_slug: string
  asking_price: string | number | null
  unit_number?: string | null
  unit_slug?: string | null
}

export const navigation: { key: ResourceKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '◫' },
  { key: 'marketplace', label: 'Marketplace', icon: '⌂' },
  { key: 'properties', label: 'Properties', icon: '▦' },
  { key: 'units', label: 'Units', icon: '▤' },
  { key: 'listings', label: 'Listings', icon: '◇' },
  { key: 'leads', label: 'Leads', icon: '↗' },
  { key: 'viewings', label: 'Viewings', icon: '◷' },
  { key: 'offers', label: 'Offers', icon: '◎' },
  { key: 'tenants', label: 'Tenants', icon: '♙' },
  { key: 'transactions', label: 'Transactions', icon: '⇄' },
  { key: 'profile', label: 'Profile', icon: '◉' },
]

export const endpoints: Partial<Record<ResourceKey, string>> = {
  properties: '/properties',
  units: '/units',
  listings: '/listings/mine',
  leads: '/leads',
  viewings: '/viewings',
  offers: '/offers',
  tenants: '/tenants',
  transactions: '/transactions',
}

export const createEndpoints: Partial<Record<ResourceKey, string>> = {
  listings: '/listings',
}

export const tableFields: Partial<Record<ResourceKey, [string, string][]>> = {
  properties: [['name', 'Property'], ['address_line1', 'Address'], ['city', 'City'], ['status', 'Status']],
  units: [['unit_number', 'Unit'], ['property_name', 'Property'], ['bedrooms', 'Beds'], ['monthly_rent', 'Rent'], ['availability_status', 'Availability']],
  listings: [['property_id', 'Property ID'], ['unit_id', 'Unit ID'], ['asking_price', 'Price'], ['status', 'Status']],
  leads: [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['status', 'Status']],
  viewings: [['contact_name', 'Prospect'], ['contact_email', 'Email'], ['scheduled_at', 'Scheduled'], ['status', 'Status']],
  offers: [['contact_name', 'Prospect'], ['amount', 'Offer'], ['status', 'Status'], ['listing_id', 'Listing ID']],
  tenants: [['full_name', 'Tenant'], ['email', 'Email'], ['property_id', 'Property ID'], ['status', 'Status']],
  transactions: [['offer_id', 'Accepted offer'], ['amount', 'Amount'], ['status', 'Status'], ['created_at', 'Created']],
}

export function isRecord(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRows(value: unknown): ApiRow[] {
  if (!Array.isArray(value)) {
    throw new Error('The API returned an unexpected response; expected a list.')
  }
  if (!value.every(isRecord)) {
    throw new Error('The API returned a list containing an invalid record.')
  }
  return value
}

export function propertyOptionsFromRows(rows: ApiRow[]): SelectOption[] {
  return rows.map((row) => {
    if (typeof row.id !== 'string' || typeof row.name !== 'string') {
      throw new Error('A property response is missing its ID or name.')
    }
    return { value: row.id, label: row.name }
  })
}

export function unitOptionsFromRows(rows: ApiRow[]): SelectOption[] {
  return rows.map((row) => {
    if (typeof row.id !== 'string' || typeof row.unit_number !== 'string' || typeof row.property_id !== 'string') {
      throw new Error('A unit response is missing its ID, unit number, or property ID.')
    }
    return { value: row.id, label: row.unit_number, parentValue: row.property_id }
  })
}

export function availableUnitOptionsFromRows(rows: ApiRow[]): SelectOption[] {
  return unitOptionsFromRows(rows.filter((row) => row.availability_status === 'available'))
}

function isPublicListing(row: ApiRow): row is PublicListing {
  return typeof row.id === 'string'
    && typeof row.property_name === 'string'
    && typeof row.property_slug === 'string'
    && (row.asking_price === null || typeof row.asking_price === 'string' || typeof row.asking_price === 'number')
}

export function asPublicListings(value: unknown): PublicListing[] {
  const listings = asRows(value)
  if (!listings.every(isPublicListing)) {
    throw new Error('The listings API returned an invalid listing record.')
  }
  return listings
}

export function textValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return ''
}

export function inputValue(value: unknown, type: FieldType): string {
  const valueText = textValue(value)
  if (type === 'datetime-local' && valueText) {
    const date = new Date(valueText)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 16)
  }
  return valueText
}

export function formValuesFromData(fields: FieldSpec[], formData: FormData): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    const rawValue = formData.get(field.key)
    if (typeof rawValue !== 'string' || rawValue === '') continue

    if (field.type === 'number') {
      const numberValue = Number(rawValue)
      if (!Number.isFinite(numberValue)) {
        throw new Error(`${field.label} must be a valid number.`)
      }
      values[field.key] = numberValue
    } else if (field.type === 'datetime-local') {
      values[field.key] = new Date(rawValue).toISOString()
    } else {
      values[field.key] = rawValue
    }
  }
  return values
}

export function formatValue(value: unknown, key: string): string {
  const valueText = textValue(value)
  if (!valueText) return '—'
  if (key.includes('price') || key.includes('rent') || key === 'amount') {
    const amount = Number(valueText)
    if (Number.isFinite(amount)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount)
    }
  }
  if (key.endsWith('_at') || key.endsWith('_date')) {
    const date = new Date(valueText)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    }
  }
  return valueText
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function fieldsFor(
  resource: ResourceKey,
  mode: 'create' | 'edit',
  choices: { properties?: SelectOption[]; units?: SelectOption[] } = {},
): FieldSpec[] {
  if (resource === 'properties') {
    return [
      { key: 'name', label: 'Property name', type: 'text', required: mode === 'create' },
      { key: 'slug', label: 'URL slug', type: 'text', required: mode === 'create' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'address_line1', label: 'Street address', type: 'text', required: mode === 'create' },
      { key: 'city', label: 'City', type: 'text', required: mode === 'create' },
      { key: 'state', label: 'State / region', type: 'text', required: mode === 'create' },
      { key: 'postal_code', label: 'Postal code', type: 'text', required: mode === 'create' },
      { key: 'country', label: 'Country', type: 'text', defaultValue: 'US' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active'], defaultValue: 'draft' },
    ]
  }
  if (resource === 'units') {
    const unitFields: FieldSpec[] = [
      {
        key: 'property_id',
        label: 'Property',
        type: 'select',
        required: mode === 'create',
        options: choices.properties ?? [],
        emptyOptionLabel: 'Choose a property',
        hint: choices.properties?.length ? undefined : 'Add a property before creating a unit.',
      },
      { key: 'unit_number', label: 'Unit number', type: 'text', required: mode === 'create' },
      { key: 'slug', label: 'URL slug', type: 'text' },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: mode === 'create', step: '1' },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number', required: mode === 'create', step: '0.5' },
      { key: 'sq_ft', label: 'Square feet', type: 'number', step: '1' },
      { key: 'monthly_rent', label: 'Monthly rent', type: 'number', step: '0.01' },
      { key: 'availability_status', label: 'Availability', type: 'select', options: ['available', 'occupied', 'maintenance'], defaultValue: 'available' },
    ]
    return mode === 'create' ? unitFields : unitFields.filter((field) => field.key !== 'property_id')
  }
  if (resource === 'listings') {
    return mode === 'create'
      ? [
          { key: 'property_id', label: 'Property', type: 'select', required: true, options: choices.properties ?? [], emptyOptionLabel: 'Choose a property', hint: choices.properties?.length ? undefined : 'Add a property before creating a listing.' },
          { key: 'unit_id', label: 'Unit (optional)', type: 'select', options: choices.units ?? [], dependsOn: 'property_id', emptyOptionLabel: 'List entire property' },
          { key: 'asking_price', label: 'Asking price / rent', type: 'number', required: true, step: '0.01' },
        ]
      : [
          { key: 'asking_price', label: 'Asking price / rent', type: 'number', step: '0.01' },
          { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'paused', 'rented', 'closed'] },
        ]
  }
  if (resource === 'leads') {
    return [{ key: 'status', label: 'Lead status', type: 'select', options: ['new', 'contacted', 'qualified', 'converted', 'lost'], required: true }]
  }
  if (resource === 'viewings') {
    return [
      { key: 'scheduled_at', label: 'Scheduled at', type: 'datetime-local' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['requested', 'confirmed', 'completed', 'cancelled'] },
    ]
  }
  if (resource === 'offers') {
    return [{ key: 'status', label: 'Offer status', type: 'select', options: ['accepted', 'rejected', 'withdrawn'], required: true }]
  }
  if (resource === 'tenants') {
    return mode === 'create'
      ? [
          { key: 'property_id', label: 'Property', type: 'select', required: true, options: choices.properties ?? [], emptyOptionLabel: 'Choose a property' },
          { key: 'unit_id', label: 'Unit (optional)', type: 'select', options: choices.units ?? [], dependsOn: 'property_id', emptyOptionLabel: 'No unit' },
          { key: 'full_name', label: 'Full name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'move_in_date', label: 'Move-in date', type: 'date' },
        ]
      : [
          { key: 'full_name', label: 'Full name', type: 'text' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: ['pending', 'active', 'terminated'] },
          { key: 'move_in_date', label: 'Move-in date', type: 'date' },
        ]
  }
  if (resource === 'transactions') {
    return mode === 'create'
      ? [
          { key: 'offer_id', label: 'Accepted offer ID', type: 'text', required: true },
          { key: 'tenant_id', label: 'Tenant ID (optional)', type: 'text' },
        ]
      : [{ key: 'status', label: 'Status', type: 'select', options: ['completed', 'cancelled'], required: true }]
  }
  return []
}
