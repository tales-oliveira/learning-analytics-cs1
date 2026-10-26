// client.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('la_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      // Não desloga se for erro nas rotas de perfil ou jobs
      const isSafeRoute = url.includes('/auth/me') || url.includes('/jobs/active')
      const isAlreadyOnLogin = window.location.pathname === '/login'

      if (!isSafeRoute && !isAlreadyOnLogin) {
        localStorage.removeItem('la_token')
        localStorage.removeItem('la_student')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api