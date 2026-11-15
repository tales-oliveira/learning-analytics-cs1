import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamFeedback } from '../api/student'; // <-- Importa a nova função
import Spinner from '../components/Spinner';
import Badge from '../components/Badge';
import FunctionCheckCard from '../components/FunctionCheckCard';

const SHOW_DIAGNOSIS = true;
const SHOW_FUNCTION_CHECK = true;
const SHOW_COMPILE_ERROR = true;
const SHOW_WARNINGS = true;
const SHOW_TEST_RESULTS = true;

function diagColor(cat) {
  if (!cat) return 'gray';
  if (cat === 'Correto') return 'green';
  if (cat.startsWith('Aviso')) return 'yellow';
  return 'red';
}

export default function StudentExamFeedbackPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [examInfo, setExamInfo] = useState(null);

  useEffect(() => {
    getExamFeedback(examId)
      .then(({ data }) => {
        setData(data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Erro ao carregar o feedback.');
      });
  }, [examId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md">
          <p className="font-semibold mb-2">Aviso</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => navigate('/student')} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
            Voltar para as turmas
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8 text-purple-600" />
      </div>
    );
  }

  const qNumbers = Object.keys(data.feedback || {});
  
  // Se não houver feedback (ex: o aluno não submeteu nada), mostra um aviso
  if (qNumbers.length === 0) {
     return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-50 text-gray-700 p-6 rounded-xl border border-gray-200 text-center max-w-md">
          <p className="font-semibold mb-2">Sem feedback</p>
          <p className="text-sm">Parece que você não enviou nenhuma resposta para esta prova.</p>
          <button onClick={() => navigate(-1)} className="mt-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const currentNumber = qNumbers[qIndex];
  const fb = data.feedback?.[currentNumber];
  const tech = data.results?.[currentNumber];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-3">
            <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Feedback da Avaliação</h1>
          <p className="text-sm text-gray-500 mt-1">Confira o seu desempenho e as dicas da IA.</p>
        </div>

        {/* Navegação de Questões */}
        <div className="flex flex-wrap gap-2 justify-center">
          {qNumbers.map((num, idx) => (
            <button
              key={num}
              onClick={() => setQIndex(idx)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                qIndex === idx
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Questão {num}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {/* Feedback da IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                Questão {currentNumber}
              </span>
            </div>

            {fb?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                Não foi possível gerar o feedback desta questão ({fb.error}).
              </div>
            )}

            {fb?.overall && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Comentário geral</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{fb.overall}</p>
              </div>
            )}

            {fb?.pontos_fortes?.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h3 className="text-xs font-bold text-green-800 mb-2">✓ Pontos fortes</h3>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  {fb.pontos_fortes.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {fb?.melhorias?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h3 className="text-xs font-bold text-amber-800 mb-2">→ Pontos a melhorar</h3>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  {fb.melhorias.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {fb?.next_steps && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-xs font-bold text-blue-800 mb-1">Próximos passos</h3>
                <p className="text-sm text-blue-800">{fb.next_steps}</p>
              </div>
            )}
          </div>

          {/* Resultado Técnico */}
          {tech && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Resultado técnico</h3>

              {SHOW_DIAGNOSIS && tech.diagnosis && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge color={diagColor(tech.diagnosis.error_category)}>
                      {tech.diagnosis.error_category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{tech.diagnosis.pedagogical_diagnosis}</p>
                  {tech.diagnosis.actionable_feedback && (
                    <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
                      <p className="text-xs text-blue-700">{tech.diagnosis.actionable_feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {SHOW_FUNCTION_CHECK && tech.function_check && !tech.function_check.compliant && (
                <FunctionCheckCard check={tech.function_check} />
              )}

              {SHOW_COMPILE_ERROR && tech.compile_error && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Erro de compilação</h4>
                  <pre className="text-xs font-mono bg-gray-900 rounded-lg p-3 overflow-x-auto text-red-400 whitespace-pre-wrap">
                    {tech.compile_error}
                  </pre>
                </div>
              )}

              {SHOW_WARNINGS && tech.warnings && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Avisos do compilador</h4>
                  <pre className="text-xs font-mono bg-gray-900 rounded-lg p-3 overflow-x-auto text-yellow-400 whitespace-pre-wrap">
                    {tech.warnings}
                  </pre>
                </div>
              )}

              {SHOW_TEST_RESULTS && tech.test_results?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Testes: {tech.test_results.filter(t => t.passed).length}/{tech.test_results.length} passaram
                  </h4>
                  <div className="space-y-2">
                    {tech.test_results.map((tr, i) => (
                      <div key={i} className={`rounded-lg border px-4 py-3 ${tr.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-semibold ${tr.passed ? 'text-green-700' : 'text-red-700'}`}>
                            {tr.passed ? '✓ Correto' : '✗ Incorreto'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                          <div><span className="text-gray-400">entrada: </span><span className="text-gray-700">{tr.input || '(vazia)'}</span></div>
                          <div><span className="text-gray-400">esperado: </span><span className="text-gray-700">{tr.expected_output}</span></div>
                          {!tr.passed && <div><span className="text-gray-400">obtido: </span><span className="text-red-700">{tr.actual_output}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center pt-4">
          <button onClick={() => navigate('/student')} className="text-sm px-6 py-2.5 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors">
            Voltar para as Turmas
          </button>
        </div>
      </div>
    </div>
  );
}