import api from './client'

export const registerStudent = (matricula, nome, senha) =>
  api.post('/auth/register/student', { matricula, nome, senha })

export const loginStudent = (matricula, senha) =>
  api.post('/auth/login/student', { matricula, senha })

export const getMe = () =>
  api.get('/auth/student/me')

export const updateProfile = (nome) =>
  api.put('/auth/student/me', { nome })

export const changePassword = (senha_atual, senha_nova) =>
  api.put('/auth/student/me/password', { senha_atual, senha_nova })

