import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamForStudent, submitExamFinal, testStudentCode  } from '../api/student';
import Spinner from '../components/Spinner';
import Badge from '../components/Badge';
import FunctionCheckCard from '../components/FunctionCheckCard';

const ENABLE_CODE_TEST    = true;  // botão "Testar código" na tela de prova
const SHOW_DIAGNOSIS      = true;  // diagnóstico automático (Badge + texto)
const SHOW_FUNCTION_CHECK = true;  // card de verificação de funções exigidas
const SHOW_COMPILE_ERROR  = true;  // bloco de erro de compilação
const SHOW_WARNINGS       = true;  // avisos do compilador
const SHOW_TEST_RESULTS   = true;  // lista de casos de teste
const SHOW_REQUIRED_META  = true;  // estruturas/funções exigidas no enunciado
const DEV_TEST_PANEL = true;

// ─────────────────────────────────────────────────────────────
function formatRequiredFunction(fn) {
  const tags = [];
  if (fn.requires_recursion) tags.push('recursiva');
  if (fn.requires_pointer_param) tags.push('ponteiro');
  const params = fn.param_count != null ? `(${fn.param_count} param.)` : '';
  const suffix = tags.length ? ` [${tags.join(', ')}]` : '';
  return `${fn.name}${params}${suffix}`;
}

function diagColor(cat) {
  if (!cat) return 'gray';
  if (cat === 'Correto') return 'green';
  if (cat.startsWith('Aviso')) return 'yellow';
  return 'red';
}

export default function StudentSubmitPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Pós-entrega
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackQIndex, setFeedbackQIndex] = useState(0);

  // Teste individual (desativado por enquanto)
  const [testing, setTesting] = useState(false);
  const [resultsMap, setResultsMap] = useState({});

  useEffect(() => {
    getExamForStudent(examId).then(({ data }) => {
      setExam(data);
      const initialDrafts = {};
      data.questions.forEach(q => {
        initialDrafts[q.number] = '';
      });
      setDrafts(initialDrafts);
    });
  }, [examId]);

  if (!exam) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-purple-600" />
      </div>
    );
  }

  const currentQ = exam.questions[currentQIndex];

  const handleCodeChange = (newCode) => {
    setDrafts(prev => ({ ...prev, [currentQ.number]: newCode }));
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentCode = drafts[currentQ.number] || '';
    const newCode = currentCode.substring(0, start) + '    ' + currentCode.substring(end);
    handleCodeChange(newCode);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + 4;
    }, 0);
  };

  const handleTestCode = async () => {
    const code = drafts[currentQ.number];
    if (!code?.trim()) return;
    setTesting(true);
    try {
      const { data } = await testStudentCode(examId, currentQ.number, code, true);
      setResultsMap(prev => ({ ...prev, [currentQ.number]: data }));
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro ao avaliar o código.');
    } finally {
      setTesting(false);
  }
  };

  const handleFinalSubmit = async () => {
    if (!window.confirm('Deseja finalizar a prova? Você não poderá alterar suas respostas depois.')) return;
    setSubmitting(true);
    try {
      await submitExamFinal(examId, drafts);
      alert("Prova enviada com sucesso! O feedback estará disponível após o encerramento da prova.");
      navigate(`/student/turma/${exam.turma_id}`); // Redireciona para a turma
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro ao entregar prova.');
    } finally {
      setSubmitting(false);
    }
  };


  // ─────────────────────────────────────────────────────────
  // TELA DE PROVA
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{exam.filename}</h1>
          <p className="text-xs text-gray-500">
            {exam.turma_nome && <span className="mr-2">{exam.turma_nome}</span>}
            Valor total: {exam.total_points ?? 0} pontos
          </p>
        </div>
        <button
          onClick={handleFinalSubmit}
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
        >
          {submitting ? 'Entregando...' : 'Entregar Prova'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Navegação</p>
          <div className="flex flex-col gap-2">
            {exam.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentQIndex === idx
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Questão {q.number}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden">
          {/* Enunciado */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200 bg-white">
            <div className="mb-4">
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                Questão {currentQ.number}
              </span>
              <span className="ml-3 text-xs text-gray-500">
                Vale: <span className="font-medium text-gray-700">{currentQ.points ?? 1} pontos</span>
              </span>
            </div>

            <h2 className="text-base font-medium text-gray-900 mb-4 whitespace-pre-wrap leading-relaxed">
              {currentQ.statement}
            </h2>

            {SHOW_REQUIRED_META && (
              <div className="space-y-3 mt-4">
                {currentQ.required_structures?.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-bold text-gray-700 mb-1">Obrigatório usar:</p>
                    <p className="text-xs text-purple-600 font-mono">
                      {currentQ.required_structures.join(', ')}
                    </p>
                  </div>
                )}
                {currentQ.forbidden_structures?.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-700 mb-1">Estruturas proibidas:</p>
                    <p className="text-xs text-red-600 font-mono">
                      {currentQ.forbidden_structures.join(', ')}
                    </p>
                  </div>
                )}
                {currentQ.required_functions?.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-bold text-gray-700 mb-1">Funções exigidas:</p>
                    <p className="text-xs text-purple-600 font-mono">
                      {currentQ.required_functions.map(formatRequiredFunction).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
            <div className="flex-1 relative">
              <textarea
                value={drafts[currentQ.number] || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu código"
                className="w-full h-full bg-[#1e1e1e] text-green-400 p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* ENABLE_CODE_TEST */}
            {DEV_TEST_PANEL && (
              <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-500 truncate">
                  {testing ? 'Executando testes e gerando feedback…' : 'testar)'}
                </span>
                <button
                  onClick={handleTestCode}
                  disabled={testing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50 shrink-0"
                >
                  {testing ? 'Rodando…' : 'teste e feedback'}
                </button>
              </div>
            )}

            {/* ── BLOCO 2: os RESULTADOS (só aparece depois de um teste bem-sucedido) ── */}
            {DEV_TEST_PANEL && resultsMap[currentQ.number] && (
              <div className="max-h-96 overflow-y-auto bg-gray-50 border-t border-gray-300 p-4 space-y-4">

                {/* ── Feedback IA ── */}
                {resultsMap[currentQ.number].ai_feedback && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-purple-700">Feedback IA</h4>

                    {resultsMap[currentQ.number].ai_feedback.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        Não foi possível gerar o feedback ({resultsMap[currentQ.number].ai_feedback.error}).
                      </div>
                    )}

                    {resultsMap[currentQ.number].ai_feedback.overall && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-1">Comentário geral</h5>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {resultsMap[currentQ.number].ai_feedback.overall}
                        </p>
                      </div>
                    )}

                    {resultsMap[currentQ.number].ai_feedback.pontos_fortes?.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-green-800 mb-2">✓ Pontos fortes</h5>
                        <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                          {resultsMap[currentQ.number].ai_feedback.pontos_fortes.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}

                    {resultsMap[currentQ.number].ai_feedback.melhorias?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-amber-800 mb-2">→ Pontos a melhorar</h5>
                        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                          {resultsMap[currentQ.number].ai_feedback.melhorias.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}

                    {resultsMap[currentQ.number].ai_feedback.next_steps && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-blue-800 mb-1">Próximos passos</h5>
                        <p className="text-sm text-blue-800">
                          {resultsMap[currentQ.number].ai_feedback.next_steps}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Resultado técnico ── */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Resultado do teste</h4>

                  {resultsMap[currentQ.number].compile_error && (
                    <pre className="text-xs font-mono bg-gray-900 rounded-lg p-2 text-red-400 whitespace-pre-wrap mb-2">
                      {resultsMap[currentQ.number].compile_error}
                    </pre>
                  )}

                  {resultsMap[currentQ.number].test_results?.map((tr, i) => (
                    <div
                      key={i}
                      className={`rounded p-2 text-xs font-mono border mb-1 ${
                        tr.passed
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div>{tr.passed ? '✓ Passou' : '✗ Falhou'} | Entrada: {tr.input || '(vazia)'}</div>
                      {!tr.passed && (
                        <div className="mt-1 flex flex-col gap-1">
                          <div>Esperado: {tr.expected_output}</div>
                          <div>Obtido: {tr.actual_output}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}