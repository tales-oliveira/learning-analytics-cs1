import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginStudent as apiLoginStudent } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // Aluno
  const [matricula, setMatricula] = useState('')
  const [senhaAluno, setSenhaAluno] = useState('')
  const [errorAluno, setErrorAluno] = useState('')
  const [loadingAluno, setLoadingAluno] = useState(false)

  const handleAlunoSubmit = async (e) => {
    e.preventDefault()

    if (!matricula.trim() || !senhaAluno.trim()) return

    setErrorAluno('')
    setLoadingAluno(true)

    try {
      const { data } = await apiLoginStudent(matricula.trim(), senhaAluno)
      console.log('Resposta da API:', data)
      login(data.access_token, data.student) 
      
      navigate('/student', { replace: true }) 

    } catch (err) {
      setErrorAluno(
        err.response?.data?.detail || 'Erro ao fazer login.'
      )
    } finally {
      setLoadingAluno(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Logo className="w-8 h-8" />
          <span className="font-semibold text-gray-900">
            Analytics CS1
          </span>
        </div>

          {/* ================= ALUNO ================= */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">
              Área do aluno
            </h1>

            <p className="text-sm text-gray-400 mb-6">
              Acesse sua conta de aluno
            </p>

            <form
              onSubmit={handleAlunoSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Matrícula
                </label>

                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Digite sua matrícula"
                  autoComplete="username"
                  required
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Senha
                </label>

                <input
                  type="password"
                  value={senhaAluno}
                  onChange={e => setSenhaAluno(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {errorAluno && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {errorAluno}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingAluno}
                className="w-full text-sm py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loadingAluno ? 'Entrando…' : 'Entrar como aluno'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-400">
              Ainda não possui conta?{' '}
              <Link
                to="/register-student"
                className="text-purple-600 hover:underline font-medium"
              >
                Criar cadastro
              </Link>
            </p>
          </div>

      </div>
    </div>
  )
}