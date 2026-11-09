const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isBackendUnavailable(error: unknown): boolean {
  return (error instanceof ApiError && [502, 503, 504].includes(error.status))
    || error instanceof TypeError
}

export async function apiRequest<T>(
  path: string,
  options: {
    token?: string
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
  } = {},
): Promise<T | undefined> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 204) {
    return undefined
  }

  const responseText = await response.text()
  let payload: unknown
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown
    } catch {
      if (!response.ok) {
        throw new ApiError(responseText, response.status)
      }
      throw new ApiError('The server returned an invalid JSON response.', response.status)
    }
  }

  if (!response.ok) {
    const root = isRecord(payload) ? payload : {}
    const error = isRecord(root.error) ? root.error : root
    const message = typeof error.message === 'string'
      ? error.message
      : typeof error.error === 'string'
        ? error.error
        : `Request failed with status ${response.status}.`
    throw new ApiError(message, response.status)
  }

  return payload as T | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
