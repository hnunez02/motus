import { Capacitor } from '@capacitor/core'
import { CapacitorHttp } from '@capacitor/core'
import axios from 'axios'
import { supabase } from './supabase.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

console.log('API initialized, platform:', Capacitor.getPlatform(), 'baseURL:', BASE_URL)

const isNative = Capacitor.isNativePlatform()

// 10s timeout on all native requests — prevents hanging forever on airplane mode
const NATIVE_TIMEOUT = 10000

// Get cached Supabase token — reads from localStorage, never makes a network call
async function getAuthHeader() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

const api = {
  async get(url, config = {}) {
    const authHeader = await getAuthHeader();
    if (isNative) {
      const response = await CapacitorHttp.get({
        url: `${BASE_URL}${url}`,
        connectTimeout: NATIVE_TIMEOUT,
        readTimeout: NATIVE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...config.headers,
        },
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.get(`${BASE_URL}${url}`, {
      timeout: NATIVE_TIMEOUT,
      ...config,
      headers: { ...authHeader, ...config.headers },
    })
  },

  async post(url, data, config = {}) {
    const authHeader = await getAuthHeader();
    if (isNative) {
      const response = await CapacitorHttp.post({
        url: `${BASE_URL}${url}`,
        connectTimeout: NATIVE_TIMEOUT,
        readTimeout: NATIVE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...config.headers,
        },
        data,
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.post(`${BASE_URL}${url}`, data, {
      timeout: NATIVE_TIMEOUT,
      ...config,
      headers: { ...authHeader, ...config.headers },
    })
  },

  async patch(url, data, config = {}) {
    const authHeader = await getAuthHeader();
    if (isNative) {
      const response = await CapacitorHttp.patch({
        url: `${BASE_URL}${url}`,
        connectTimeout: NATIVE_TIMEOUT,
        readTimeout: NATIVE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...config.headers,
        },
        data,
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.patch(`${BASE_URL}${url}`, data, {
      timeout: NATIVE_TIMEOUT,
      ...config,
      headers: { ...authHeader, ...config.headers },
    })
  },
}

export default api
