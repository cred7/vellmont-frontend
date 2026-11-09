import { describe, expect, it } from 'vitest'
import {
  availableUnitOptionsFromRows,
  asRows,
  createEndpoints,
  endpoints,
  fieldsFor,
  formValuesFromData,
  propertyOptionsFromRows,
  unitOptionsFromRows,
} from './domain'

describe('property and unit form choices', () => {
  const properties = propertyOptionsFromRows(asRows([
    { id: 'property-1', name: 'Maple Court' },
    { id: 'property-2', name: 'Oak House' },
  ]))
  const units = unitOptionsFromRows(asRows([
    { id: 'unit-1', unit_number: 'A-101', property_id: 'property-1' },
    { id: 'unit-2', unit_number: 'B-202', property_id: 'property-2' },
  ]))

  it('uses property names as labels and preserves backend IDs as values', () => {
    const propertyField = fieldsFor('units', 'create', { properties })[0]

    expect(propertyField).toMatchObject({
      key: 'property_id',
      type: 'select',
      options: [
        { value: 'property-1', label: 'Maple Court' },
        { value: 'property-2', label: 'Oak House' },
      ],
    })

    describe('resource API routes', () => {
      it('uses the landlord listings route for reads and the collection route for creation', () => {
        expect(endpoints.listings).toBe('/listings/mine')
        expect(createEndpoints.listings).toBe('/listings')
      })
    })
  })

  it('associates tenant unit choices with their property IDs', () => {
    const fields = fieldsFor('tenants', 'create', { properties, units })

    expect(fields.find((field) => field.key === 'property_id')?.options).toEqual(properties)
    expect(fields.find((field) => field.key === 'unit_id')).toMatchObject({
      dependsOn: 'property_id',
      options: [
        { value: 'unit-1', label: 'A-101', parentValue: 'property-1' },
        { value: 'unit-2', label: 'B-202', parentValue: 'property-2' },
      ],
    })
  })

  it('creates property listings by name and only offers available units for that property', () => {
    const availableUnits = availableUnitOptionsFromRows([
      { id: 'unit-1', unit_number: 'A-101', property_id: 'property-1', availability_status: 'available' },
      { id: 'unit-2', unit_number: 'A-102', property_id: 'property-1', availability_status: 'occupied' },
      { id: 'unit-3', unit_number: 'B-201', property_id: 'property-2', availability_status: 'available' },
    ])
    const fields = fieldsFor('listings', 'create', { properties, units: availableUnits })

    expect(fields[0]).toMatchObject({
      key: 'property_id',
      label: 'Property',
      type: 'select',
      options: properties,
    })
    expect(fields[1]).toMatchObject({
      key: 'unit_id',
      dependsOn: 'property_id',
      emptyOptionLabel: 'List entire property',
      options: [
        { value: 'unit-1', label: 'A-101', parentValue: 'property-1' },
        { value: 'unit-3', label: 'B-201', parentValue: 'property-2' },
      ],
    })
  })

  it('serializes numeric unit fields as JSON numbers, not strings', () => {
    const formData = new FormData()
    formData.set('property_id', 'property-1')
    formData.set('unit_number', 'A-101')
    formData.set('bedrooms', '2')
    formData.set('bathrooms', '1.5')
    formData.set('sq_ft', '780')
    formData.set('monthly_rent', '1850')
    formData.set('availability_status', 'available')

    const values = formValuesFromData(fieldsFor('units', 'create', { properties }), formData)
    const payload = JSON.parse(JSON.stringify(values)) as Record<string, unknown>

    expect(payload).toMatchObject({
      property_id: 'property-1',
      bedrooms: 2,
      bathrooms: 1.5,
      sq_ft: 780,
      monthly_rent: 1850,
    })
    expect(typeof payload.bedrooms).toBe('number')
    expect(typeof payload.bathrooms).toBe('number')
  })

  it('rejects records that cannot be submitted with valid backend IDs', () => {
    expect(() => propertyOptionsFromRows([{ id: 'property-1' }])).toThrow('missing its ID or name')
    expect(() => unitOptionsFromRows([{ id: 'unit-1', unit_number: 'A-101' }])).toThrow('missing its ID, unit number, or property ID')
  })
})
