import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTurmaDetail, getMinhasTurmas } from '../api/student'; 
import Spinner from '../components/Spinner';
import ListControls from '../components/ListControls';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'name', label: 'Nome (A–Z)' },
];

export default function StudentTurmaPage() {
  const navigate = useNavigate();

  const { turmaId } = useParams();
  const [turma, setTurma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    setLoading(true);
    getTurmaDetail(turmaId)
      .then(({ data }) => setTurma(data))
      .catch(() => setError('Erro ao carregar turma.'))
      .finally(() => setLoading(false));
  }, [turmaId]);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-purple-600" /></div>;
  if (error) return <p className="text-red-600 text-sm text-center py-8">{error}</p>;
  if (!turma) return <p className="text-gray-500 text-sm text-center py-8">Turma não encontrada.</p>;

  const examsList = turma.exams ?? [];

  const displayedExams = examsList
    .filter(exam => {
      const q = search.trim().toLowerCase();
      return q ? exam.filename?.toLowerCase().includes(q) : true;
    })
    .sort((a, b) => {
      if (sort === 'name') return (a.filename || '').localeCompare(b.filename || '', 'pt-BR');
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return sort === 'oldest' ? da - db : db - da;
    });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link to="/student" className="hover:text-gray-600">Minhas Turmas</Link>
          <span>›</span>
          <span className="text-gray-600">{turma.nome}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{turma.nome}</h1>
          <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
            {turma.codigo}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Avaliações Disponíveis</h2>
        
        {examsList.length === 0 ? (
          <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Nenhuma prova agendada no momento.</p>
          </div>
        ) : (
          <>
            <ListControls
              search={search} onSearch={setSearch}
              sort={sort} onSort={setSort}
              sortOptions={SORT_OPTIONS}
              placeholder="Buscar avaliação..."
            />
            
            {displayedExams.length === 0 ? (
              <p className="text-center py-12 text-sm text-gray-400">Nenhuma avaliação encontrada.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayedExams
                  .filter(exam => exam.status !== 'upcoming') // Oculta as provas que ainda não começaram
                  .map(exam => {
                  
                  const isActive = exam.status === 'active';
                  const isEnded = exam.status === 'ended';
                  const hasSubmitted = exam.has_submitted;

                  return (
                    <div key={exam.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between hover:border-purple-300 hover:shadow-sm transition-all">
                      <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900 leading-tight mb-2 truncate">
                          {exam.filename}
                        </h2>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{exam.question_count} {exam.question_count === 1 ? 'questão' : 'questões'}</span>
                        </div>
                        
                        {/* Status visual */}
                        {isActive && hasSubmitted && (
                          <span className="inline-block mt-3 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                            ✓ Prova Enviada
                          </span>
                        )}
                        {isActive && !hasSubmitted && (
                          <span className="inline-block mt-3 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                            ⏳ Em andamento (Até {new Date(exam.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                        {isEnded && (
                          <span className="inline-block mt-3 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            ✓ Encerrada
                          </span>
                        )}
                      </div>
                      
                      {/* Botões de ação */}
                      {isActive && !hasSubmitted && (
                        <button
                          onClick={() => navigate(`/student/exam/${exam.id}`)}
                          className="w-full text-sm px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors text-center font-medium"
                        >
                          Acessar Avaliação
                        </button>
                      )}
                      
                      {isActive && hasSubmitted && (
                        <button
                          disabled
                          className="w-full text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-center font-medium"
                        >
                          Aguardando Encerramento
                        </button>
                      )}
                      
                      {isEnded && (
                        <button
                          onClick={() => navigate(`/student/exam/${exam.id}/feedback`)}
                          className="w-full text-sm px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors text-center font-medium"
                        >
                          Ver Feedback e Notas
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}