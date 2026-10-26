import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { matricularTurma, getMinhasTurmas } from '../api/student'

export default function StudentPage() {
  const navigate = useNavigate()
  const [turmasDoAluno, setTurmasDoAluno] = useState([])
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Carrega as turmas do aluno ao montar a página
  useEffect(() => {
    carregarTurmas()
  }, [])

  const carregarTurmas = async () => {
    try {
      setLoadingTurmas(true)
      const response = await getMinhasTurmas()
      setTurmasDoAluno(response.data)
    } catch (err) {
      console.error("Erro ao carregar turmas:", err)
    } finally {
      setLoadingTurmas(false)
    }
  }

  const handleMatricular = async (e) => {
    e.preventDefault()
    if (!codigo.trim()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await matricularTurma(codigo.trim())
      const novaTurma = response.data

      setSuccess(`Matrícula realizada com sucesso na turma: ${novaTurma.nome}`)
      setTurmasDoAluno([novaTurma]) // Como turma_id no aluno é 1:1, atualiza com a turma encontrada
      setCodigo('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao buscar a turma. Verifique o código.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingTurmas) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner className="w-8 h-8 text-purple-600" />
      </div>
    )
  }

  return (
    <main className="w-full max-w-4xl mx-auto p-6 mt-2">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Minhas Turmas</h1>
      
      {/* Formulário  */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Buscar nova turma</h2>
        <p className="text-sm text-gray-500 mb-5">
          Insira o código fornecido pelo professor para se matricular (ex: CS1-2026-1).
        </p>
        
        <form onSubmit={handleMatricular} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código da turma..."
            className="flex-1 text-sm rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !codigo.trim()}
            className="inline-flex items-center justify-center gap-2 text-sm px-6 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium"
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
      </div>

      {/* Lista de Turmas */}
      {turmasDoAluno.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">Você ainda não está matriculado em nenhuma turma.</p>
        </div>
      ) : (
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {turmasDoAluno.map(turma => (
            <div key={turma.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">{turma.nome}</h3>
              <p className="text-sm text-gray-500 mb-4">Código: {turma.codigo}</p>

              <button
                onClick={() => navigate(`/student/turma/${turma.id}`)}
                className="w-full text-sm px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors text-center font-medium"
              >
                Acessar ambiente da turma →
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}