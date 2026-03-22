import { Capacitor } from '@capacitor/core'
import { CapacitorHttp } from '@capacitor/core'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

console.log('API initialized, platform:', Capacitor.getPlatform(), 'baseURL:', BASE_URL)

const isNative = Capacitor.isNativePlatform()

const api = {
  async get(url, config = {}) {
    if (isNative) {
      const response = await CapacitorHttp.get({
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.get(`${BASE_URL}${url}`, config)
  },

  async post(url, data, config = {}) {
    if (isNative) {
      const response = await CapacitorHttp.post({
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        data,
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.post(`${BASE_URL}${url}`, data, config)
  },

  async patch(url, data, config = {}) {
    if (isNative) {
      const response = await CapacitorHttp.patch({
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        data,
      })
      if (response.status >= 400) throw { response }
      return { data: response.data, status: response.status }
    }
    return axios.patch(`${BASE_URL}${url}`, data, config)
  },
}

export default api
