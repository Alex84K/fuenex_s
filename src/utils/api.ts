export type User = {
  id: string
  email: string
  emailVerified: boolean
  firstName: string
  lastName: string
  phone: string
  inn: string
  address: Address | null
  avatar: AvatarMeta | null
  createdAt: string
  updatedAt: string
}

export type Address = {
  country: string
  postalCode: string
  region: string
  city: string
  street: string
  building: string
  unit: string
}

export type AvatarMeta = {
  updatedAt: string
  etag: string
}

export type ProfilePatch = {
  firstName?: string
  lastName?: string
  phone?: string
  inn?: string
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: User
}

export type APIErrorDetail = {
  code: string
  message: string
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

const ACCESS_TOKEN_KEY = "fuenex_access_token"
const REFRESH_TOKEN_KEY = "fuenex_refresh_token"

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const onRefreshed = (token: string) => {
  for (const cb of refreshSubscribers) {
    cb(token)
  }
  refreshSubscribers = []
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const headers = new Headers(options.headers ?? {})

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json")
  }

  const token = getAccessToken()
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return {} as T
  }

  if (response.status === 401 && !isRetry) {
    const isAuthRequest =
      endpoint.includes("/api/v1/auth/login") ||
      endpoint.includes("/api/v1/auth/register") ||
      endpoint.includes("/api/v1/auth/refresh")

    if (!isAuthRequest) {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true
          try {
            const refreshRes = await fetch("/api/v1/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            })

            if (refreshRes.ok) {
              const data = (await refreshRes.json()) as AuthResponse
              setTokens(data.accessToken, data.refreshToken)
              isRefreshing = false
              onRefreshed(data.accessToken)
            } else {
              isRefreshing = false
              clearTokens()
              refreshSubscribers = []
            }
          } catch {
            isRefreshing = false
            clearTokens()
            refreshSubscribers = []
          }
        }

        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            const newHeaders = new Headers(options.headers ?? {})
            newHeaders.set("Authorization", `Bearer ${newToken}`)
            if (!newHeaders.has("Content-Type") && options.body && typeof options.body === "string") {
              newHeaders.set("Content-Type", "application/json")
            }
            apiFetch<T>(endpoint, { ...options, headers: newHeaders }, true)
              .then(resolve)
              .catch(reject)
          })
        })
      }
    }
  }

  let data: { error?: { code?: string; message?: string } } | null = null
  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    data = (await response.json()) as { error?: { code?: string; message?: string } }
  }

  if (!response.ok) {
    const errorCode = data?.error?.code ?? "UNKNOWN_ERROR"
    const errorMessage =
      data?.error?.message ?? `HTTP ${String(response.status)} ${response.statusText}`
    throw new ApiError(response.status, errorCode, errorMessage)
  }

  return data as T
}

/**
 * Fetches a binary resource (avatar). Returns the full Response so the
 * caller can read .blob(), inspect headers (ETag, Content-Type), and
 * check .status directly.
 */
export async function apiFetchBinary(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<Response> {
  const headers = new Headers(options.headers ?? {})

  const token = getAccessToken()
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(endpoint, { ...options, headers })

  if (response.status === 304) {
    return response
  }

  if (response.status === 401 && !isRetry) {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })

          if (refreshRes.ok) {
            const data = (await refreshRes.json()) as AuthResponse
            setTokens(data.accessToken, data.refreshToken)
            isRefreshing = false
            onRefreshed(data.accessToken)
          } else {
            isRefreshing = false
            clearTokens()
            refreshSubscribers = []
          }
        } catch {
          isRefreshing = false
          clearTokens()
          refreshSubscribers = []
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken: string) => {
          const newHeaders = new Headers(options.headers ?? {})
          newHeaders.set("Authorization", `Bearer ${newToken}`)
          apiFetchBinary(endpoint, { ...options, headers: newHeaders }, true)
            .then(resolve)
            .catch(reject)
        })
      })
    }
  }

  if (!response.ok) {
    let errorCode = "UNKNOWN_ERROR"
    let errorMessage = `HTTP ${String(response.status)} ${response.statusText}`
    const ct = response.headers.get("content-type")
    if (ct?.includes("application/json")) {
      const data = (await response.json()) as { error?: { code?: string; message?: string } }
      errorCode = data.error?.code ?? errorCode
      errorMessage = data.error?.message ?? errorMessage
    }
    throw new ApiError(response.status, errorCode, errorMessage)
  }

  return response
}
