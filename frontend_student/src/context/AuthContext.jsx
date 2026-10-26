import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'la_token'
const STUDENT_KEY = 'la_student'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  
  const [student, setStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STUDENT_KEY)) } catch { return null }
  })
  
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  const login = useCallback((accessToken, studentData) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(STUDENT_KEY, JSON.stringify(studentData))
    setToken(accessToken)
    setStudent(studentData)
  }, [])

  const updateStudent = useCallback((studentData) => {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(studentData))
    setStudent(studentData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STUDENT_KEY)
    setToken(null)
    setStudent(null)
  }, [])

  // Valida token ao iniciar
  useEffect(() => {
    if (!token) return
    api.get('/auth/student/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setStudent(data))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ student, token, login, logout, updateStudent, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}