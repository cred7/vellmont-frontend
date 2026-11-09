import { useState, type FormEvent, type ReactNode } from 'react'
import { isBackendUnavailable } from '../api'
import type { ApiRow, FieldSpec, FormModel } from '../domain'
import { errorMessage, formatValue, formValuesFromData, inputValue } from '../domain'

export function ListingDetails({ listing, onClose, onLead, onViewing, onOffer }: { listing: ApiRow; onClose: () => void; onLead: () => void; onViewing: () => void; onOffer: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Available home</p>
        <h2 className="mt-2 text-2xl font-semibold">{String(listing.property_name || 'Rental home')}</h2>
        <p className="mt-2 text-sm text-slate-500">{listing.unit_number ? `Unit ${String(listing.unit_number)} · ` : ''}{String(listing.property_slug || '')}</p>
        <p className="mt-5 text-3xl font-semibold text-emerald-950">{formatValue(listing.asking_price, 'asking_price')}<span className="text-sm font-normal text-slate-500"> / month</span></p>
        <p className="mt-4 text-sm leading-6 text-slate-600">This home is currently listed as active. Contact the property manager to ask a question, request a viewing, or submit an offer.</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <button className="bg-emerald-950 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-800" onClick={onLead}>Send enquiry</button>
          <button className="border border-slate-200 px-3 py-3 text-sm font-semibold hover:border-emerald-500" onClick={onViewing}>Request viewing</button>
          <button className="border border-slate-200 px-3 py-3 text-sm font-semibold hover:border-emerald-500" onClick={onOffer}>Make an offer</button>
        </div>
      </div>
    </ModalShell>
  )
}

export function FormDialog({
  model,
  busy,
  onBusy,
  onClose,
  footer,
}: {
  model: FormModel
  busy: boolean
  onBusy: (busy: boolean) => void
  onClose: () => void
  footer?: ReactNode
}) {
  const [localError, setLocalError] = useState('')
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(model.fields.map((field) => [
      field.key,
      inputValue(model.initialValues?.[field.key] ?? field.defaultValue, field.type),
    ])),
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLocalError('')
    onBusy(true)
    try {
      const values = formValuesFromData(model.fields, formData)
      await model.onSubmit(values)
      onClose()
    } catch (submitError) {
      setLocalError(isBackendUnavailable(submitError)
        ? 'Vellmont is temporarily unavailable. Check your connection and try again shortly.'
        : errorMessage(submitError))
    } finally {
      onBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-tight">{model.title}</h2>{model.description && <p className="mt-1 text-sm text-slate-500">{model.description}</p>}</div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center text-xl text-slate-400 hover:bg-slate-100" aria-label="Close dialog">×</button>
        </div>
      </div>
      <form onSubmit={(event) => void submit(event)} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 sm:px-8">
        {localError && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{localError}</p>}
        {model.fields.map((field) => (
          <FormField
            key={field.key}
            field={field}
            value={selectedValues[field.key] ?? ''}
            parentValue={field.dependsOn ? selectedValues[field.dependsOn] ?? '' : undefined}
            onChange={(value) => {
              setSelectedValues((current) => {
                const next = { ...current, [field.key]: value }
                for (const dependentField of model.fields) {
                  if (dependentField.dependsOn === field.key) next[dependentField.key] = ''
                }
                return next
              })
            }}
          />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          {footer ?? <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Cancel</button>}
          <button type="submit" disabled={busy} className="bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{busy ? 'Please wait…' : model.submitLabel}</button>
        </div>
      </form>
    </ModalShell>
  )
}

function FormField({
  field,
  value,
  parentValue,
  onChange,
}: {
  field: FieldSpec
  value: string
  parentValue?: string
  onChange: (value: string) => void
}) {
  if (field.type === 'hidden') return <input type="hidden" name={field.key} value={value} />
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}{field.required && <span className="text-rose-600"> *</span>}</span>
      {field.type === 'textarea' ? (
        <textarea name={field.key} defaultValue={value} required={field.required} rows={3} className="w-full resize-y border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
      ) : field.type === 'select' ? (
        <select
          name={field.key}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          disabled={field.dependsOn !== undefined && !parentValue}
          className="w-full border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">
            {field.dependsOn && !parentValue
              ? 'Choose a property first'
              : field.options?.some((option) => typeof option !== 'string' && option.parentValue === parentValue)
                ? field.emptyOptionLabel ?? (field.required ? 'Choose an option' : 'No change')
                : field.dependsOn
                  ? 'No units for this property'
                  : field.emptyOptionLabel ?? (field.required ? 'Choose an option' : 'No change')}
          </option>
          {field.options
            ?.filter((option) => typeof option === 'string' || !field.dependsOn || option.parentValue === parentValue)
            .map((option) => {
              const optionValue = typeof option === 'string' ? option : option.value
              const optionLabel = typeof option === 'string' ? option.replaceAll('_', ' ') : option.label
              return <option key={optionValue} value={optionValue}>{optionLabel}</option>
            })}
        </select>
      ) : (
        <input name={field.key} type={field.type} defaultValue={value} required={field.required} step={field.step} min={field.type === 'number' ? '0' : undefined} className="w-full border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
      )}
      {field.hint && <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>}
    </label>
  )
}

export function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" className="my-auto max-h-[90vh] w-full max-w-xl overflow-hidden bg-white shadow-2xl">
        {children}
      </section>
    </div>
  )
}
