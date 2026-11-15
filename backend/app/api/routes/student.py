from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone 

from app.auth.dependencies import get_current_student
from app.models.database import get_db
from app.models.orm import Student, Turma, Exam, Question
from app.services.turma_service import matricular_estudante_por_codigo, get_turma_do_estudante
from app.services.submission_service import evaluate_submission
from app.models.schemas import SubmitExamRequest, SubmitExamResponse, ExamResponse, TestCodeRequest, TestCodeResponse 
from app.llm.student_feedback import generate_student_feedback_batch, generate_student_feedback
from app.api._compartilhado import exam_to_response

router = APIRouter(prefix="/student", tags=["student"])

class MatricularRequest(BaseModel):
    codigo: str

@router.post("/matricular")
def matricular(body: MatricularRequest, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    try:
        turma = matricular_estudante_por_codigo(
            student_id=current_student.id,
            codigo_turma=body.codigo.strip(),
            db=db
        )
        return {
            "id": turma.id,
            "nome": turma.nome,
            "codigo": turma.codigo
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/turmas")
def minhas_turmas(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    turma = get_turma_do_estudante(student_id=current_student.id, db=db)
    if not turma:
        return []
    return [{
        "id": turma.id,
        "nome": turma.nome,
        "codigo": turma.codigo
    }]

@router.get("/turmas/{turma_id}")
def get_turma_detail(turma_id: int, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    if current_student.turma_id != turma_id:
        raise HTTPException(status_code=403, detail="Sem permissão.")
    
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")

    exams = db.query(Exam).filter(Exam.turma_id == turma_id, Exam.is_published == True).all()

    from datetime import datetime
    
    def calc_status(exam):
        now = datetime.now() # <-- Usando hora local
        if exam.start_time and now < exam.start_time: return "upcoming"
        if exam.end_time and now > exam.end_time: return "ended"
        return "active"

    return {
        "id": turma.id, "nome": turma.nome, "codigo": turma.codigo,
        "exams": [
            {
                "id": exam.id, "filename": exam.filename,
                "question_count": len(exam.questions) if hasattr(exam, 'questions') and exam.questions else 0,
                "created_at": exam.created_at.isoformat() if hasattr(exam, 'created_at') and exam.created_at else None,
                "start_time": exam.start_time.isoformat() if exam.start_time else None,
                "end_time": exam.end_time.isoformat() if exam.end_time else None,
                "status": calc_status(exam)
            } for exam in exams
        ]
    }  

@router.get("/exam/{exam_id}", response_model=ExamResponse)
def get_exam_for_student(
    exam_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada.")
    if current_student.turma_id != exam.turma_id:
        raise HTTPException(status_code=403, detail="Não tem permissão para aceder a esta prova.")

    if not exam.is_published:
        raise HTTPException(status_code=403, detail="Prova não disponível.")
    
    from datetime import datetime, timezone
    if exam.start_time:
        start_utc = exam.start_time.replace(tzinfo=timezone.utc) if exam.start_time.tzinfo is None else exam.start_time
        if datetime.now(timezone.utc) < start_utc:
            raise HTTPException(status_code=403, detail="A prova ainda não começou. Aguarde o horário de início.")
    
    return exam_to_response(exam)



@router.post("/exam/{exam_id}/submit", response_model=SubmitExamResponse)
def submit_exam(exam_id: int, body: SubmitExamRequest, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada.")
    if current_student.turma_id != exam.turma_id:
        raise HTTPException(status_code=403, detail="Sem permissão para esta prova.")

    if exam.end_time and datetime.now() > exam.end_time:
        raise HTTPException(status_code=403, detail="O tempo da prova já esgotou. Não é mais possível enviar respostas.")
        
    # Salva as submissões no banco
    for question in exam.questions:
        code = body.drafts.get(str(question.number), "")
        if not code.strip():
            continue
        evaluate_submission(
            exam_id=exam.id,
            question_number=question.number,
            code=code,
            db=db,
            matricula=current_student.matricula,
        )

    return {"ok": True, "message": "Prova enviada. O feedback estará disponível após o encerramento."}


# TESTAR CÓDIGO INDIVIDUALMENTE ()
@router.post("/exam/{exam_id}/test", response_model=TestCodeResponse)
def test_code(
    exam_id: int,
    body: TestCodeRequest,
    with_feedback: bool = True, 
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    #avaliar o código contra os testes da questão SEM salvar a submissão.
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada.")
    if current_student.turma_id != exam.turma_id:
        raise HTTPException(status_code=403, detail="Sem permissão para esta prova.")

    question = db.query(Question).filter(
        Question.exam_id == exam.id,
        Question.number == body.question_number,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    try:
        result = evaluate_submission(
            exam_id=exam.id,
            question_number=body.question_number,
            code=body.code,
            db=db,
            matricula=current_student.matricula,
            dry_run=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    ai_feedback = None
    if with_feedback:
        ai_feedback = generate_student_feedback(
            question_statement=question.statement,
            student_code=body.code,
            compile_error=result.get("compile_error", ""),
            test_results=result.get("test_results"),
        )

    return {
        **result,
        "ai_feedback": ai_feedback,
    }


@router.get("/exam/{exam_id}/feedback")
def get_exam_feedback(exam_id: int, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.models.orm import Submission
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada.")

    # Verifica se a prova já encerrou
    if exam.end_time:
        end_utc = exam.end_time.replace(tzinfo=timezone.utc) if exam.end_time.tzinfo is None else exam.end_time
        if datetime.now(timezone.utc) <= end_utc:
            raise HTTPException(status_code=403, detail="A prova ainda está em andamento. Aguarde o encerramento para ver o feedback.")

    questoes_para_feedback = []
    results_by_number = {}

    for question in exam.questions:
        # Pega a submissão salva do aluno
        sub = db.query(Submission).filter(
            Submission.question_id == question.id,
            Submission.matricula == current_student.matricula
        ).order_by(Submission.submitted_at.desc()).first()

        if sub:
            questoes_para_feedback.append({
                "number": question.number,
                "question_statement": question.statement,
                "student_code": sub.code,
                "compile_error": sub.compile_error or "",
                "test_results": [
                    {"input": tr.input, "expected_output": tr.expected_output, "actual_output": tr.actual_output, "passed": tr.passed}
                    for tr in sub.test_results
                ],
            })
            # Reconstrói o resultado técnico que o frontend espera
            results_by_number[str(question.number)] = {
                "compile_error": sub.compile_error,
                "warnings": sub.warnings,
                "test_results": [
                    {"input": tr.input, "expected_output": tr.expected_output, "actual_output": tr.actual_output, "passed": tr.passed}
                    for tr in sub.test_results
                ],
                "diagnosis": {
                    "error_category": sub.error_category,
                    "pedagogical_diagnosis": sub.pedagogical_diagnosis,
                    "actionable_feedback": sub.actionable_feedback
                }
            }

    # AGORA SIM chama a IA, pois a prova expirou
    feedback = generate_student_feedback_batch(questoes_para_feedback)

    return {"ok": True, "feedback": feedback, "results": results_by_number}