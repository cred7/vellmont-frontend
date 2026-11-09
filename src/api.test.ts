// Runtime validation coverage for authenticated API calls and backend errors.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, isBackendUnavailable } from './api'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends JSON requests with the bearer token and returns the response body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ token: 'session-token' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest<{ token: string }>('/auth/login', {
      method: 'POST',
      token: 'session-token',
      body: { email: 'owner@example.com', password: 'password123' },
    })

    const request = fetchMock.mock.calls[0]
    const headers = new Headers(request?.[1]?.headers)
    expect(request?.[0]).toBe('/api/v1/auth/login')
    expect(headers.get('Authorization')).toBe('Bearer session-token')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(request?.[1]?.body).toBe(JSON.stringify({ email: 'owner@example.com', password: 'password123' }))
    expect(result).toEqual({ token: 'session-token' })
  })

  it('surfaces the backend error message and HTTP status', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'unauthorized' } }), { status: 401 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = apiRequest('/auth/me')
    await expect(result).rejects.toEqual(
      expect.objectContaining({ name: 'ApiError', message: 'unauthorized', status: 401 }),
    )
    await expect(result).rejects.toBeInstanceOf(ApiError)
  })

  it('accepts empty 204 responses without trying to parse a body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/properties/sample-property', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('recognizes gateway and network failures as backend downtime', () => {
    expect(isBackendUnavailable(new ApiError('bad gateway', 502))).toBe(true)
    expect(isBackendUnavailable(new ApiError('service unavailable', 503))).toBe(true)
    expect(isBackendUnavailable(new ApiError('gateway timeout', 504))).toBe(true)
    expect(isBackendUnavailable(new TypeError('Failed to fetch'))).toBe(true)
    expect(isBackendUnavailable(new ApiError('invalid input', 400))).toBe(false)
    expect(isBackendUnavailable(new ApiError('server error', 500))).toBe(false)
  })
})
