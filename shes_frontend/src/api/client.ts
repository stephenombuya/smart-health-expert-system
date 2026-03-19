/**
 * SHES API Client
 * Axios instance with automatic JWT attach, 401 → refresh flow,
 * and consistent error normalisation.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// ─── Storage helpers ──────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess:     ()    => localStorage.getItem('shes_access'),
  getRefresh:    ()    => localStorage.getItem('shes_refresh'),
  setAccess:     (t: string) => localStorage.setItem('shes_access', t),
  setRefresh:    (t: string) => localStorage.setItem('shes_refresh', t),
  setTokens:     (a: string, r: string) => {
    localStorage.setItem('shes_access', a)
    localStorage.setItem('shes_refresh', r)
  },
  clear:         ()    => {
    localStorage.removeItem('shes_access')
    localStorage.removeItem('shes_refresh')
  },
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: 401 → try refresh ───────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  )
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      const refresh = tokenStorage.getRefresh()
      if (!refresh) {
        tokenStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers!.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
        const newAccess: string = data.access
        tokenStorage.setAccess(newAccess)
        processQueue(null, newAccess)
        original.headers!.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (!error.response) {
      window.dispatchEvent(new CustomEvent('shes:network-error'))
    }

    return Promise.reject(error)
  }
)

export default api
