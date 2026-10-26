"""compartilhado entre professor (exam.py) e aluno (student.py)
ORM -> Pydantic"""

from app.models.orm import Exam, Question
from app.models.schemas import ExamResponse, QuestionResponse

# para captar trechos como "Imprima os valores em uma única linha" do enunciado
_SINGLE_LINE_HINTS = (
    "uma unica linha", "uma única linha", "em uma linha", "numa unica linha",
    "numa única linha", "em uma so linha", "em uma só linha",
    "um unico caractere", "um único caractere",
)

# peguei do exam.py antigo, para o students.py também acessar, já que o exam.py era de funcionalidades do professor
def _question_warnings(q: Question) -> list[str]:
    """Sinaliza extrações suspeitas para o professor revisar antes de confiar no veredito."""
    warnings = []

    subs = q.submissions
    if subs and not any(s.all_tests_passed for s in subs):
        warnings.append(
            f"Nenhuma das {len(subs)} submissões passou. Pode ser que o gabarito ou "
            "as estruturas exigidas estejam errados. Confira os casos de teste."
        )

    statement = (q.statement or "").lower()
    if any(h in statement for h in _SINGLE_LINE_HINTS) and any(
        "\n" in (tc.expected_output or "") for tc in q.test_cases
    ):
        warnings.append(
            "Algum caso de teste tem a saída esperada quebrada em mais de uma linha, "
            "mas o enunciado pede uma única linha. Pode ser quebra de linha do PDF."
        )

    return warnings

def question_to_response(q: Question) -> QuestionResponse:
    return QuestionResponse(
        id=q.id,
        number=q.number,
        statement=q.statement,
        points=q.points if q.points is not None else 1.0,
        required_structures=q.required_structures or [],
        forbidden_structures=q.forbidden_structures or [],
        requires_loop=q.requires_loop,
        required_functions=q.required_functions or [],
        test_case_count=len(q.test_cases),
        warnings=_question_warnings(q),
    )

def _question_sort_key(q):
    """Ordena por número da questão (numérico quando possível: 2 antes de 10)."""
    try:
        return (0, int(q.number))
    except (TypeError, ValueError):
        return (1, q.number or "")

def exam_to_response(exam: Exam) -> ExamResponse:
    return ExamResponse(
        id=exam.id,
        filename=exam.filename,
        created_at=exam.created_at.isoformat() if exam.created_at else "",
        turma_id=exam.turma_id,
        turma_nome=exam.turma.nome if exam.turma else None,
        total_points=sum((q.points if q.points is not None else 1.0) for q in exam.questions),
        questions=[question_to_response(q) for q in sorted(exam.questions, key=_question_sort_key)],
    )