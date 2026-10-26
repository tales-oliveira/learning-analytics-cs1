from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_professor, get_current_student
from app.auth.service import (
    authenticate_professor, create_access_token, hash_password, register_professor, verify_password, register_student, authenticate_student
)

from app.models.database import get_db
from app.models.orm import Professor, Student
from app.models.schemas import (
    PasswordChange, ProfessorCreate, ProfessorResponse, ProfessorUpdate, TokenResponse, StudentCreate, StudentUpdate, StudentResponse
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: ProfessorCreate, db: Session = Depends(get_db)):
    try:
        professor = register_professor(body.email, body.nome, body.senha, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TokenResponse(
        access_token=create_access_token(professor.id),
        professor=_to_response(professor),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: ProfessorCreate, db: Session = Depends(get_db)):
    professor = authenticate_professor(body.email, body.senha, db)
    if not professor:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    return TokenResponse(
        access_token=create_access_token(professor.id),
        professor=_to_response(professor),
    )


@router.get("/me", response_model=ProfessorResponse)
def me(current: Professor = Depends(get_current_professor)):
    return _to_response(current)


@router.put("/me", response_model=ProfessorResponse)
def update_me(
    body: ProfessorUpdate,
    db: Session = Depends(get_db),
    current: Professor = Depends(get_current_professor),
):
    current.nome = body.nome.strip()
    db.commit()
    db.refresh(current)
    return _to_response(current)


@router.put("/me/password", status_code=204)
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current: Professor = Depends(get_current_professor),
):
    if not verify_password(body.senha_atual, current.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    current.senha_hash = hash_password(body.senha_nova)
    db.commit()


def _to_response(p: Professor) -> ProfessorResponse:
    return ProfessorResponse(
        id=p.id,
        email=p.email,
        nome=p.nome,
        created_at=p.created_at.isoformat(),
    )



@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_student_route(body: StudentCreate, db: Session = Depends(get_db)):
    try:
        student = register_student(body.matricula, body.nome, body.senha, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return TokenResponse(
        access_token=create_access_token(student.id),
        student=StudentResponse(
            id=student.id, 
            matricula=student.matricula, 
            nome=student.nome,
            created_at=student.created_at.isoformat(),
            turma_id=student.turma_id
        )
    )

@router.post("/login/student", response_model=TokenResponse)
def login_student_route(body: StudentCreate, db: Session = Depends(get_db)):
    # Reutilizamos o StudentCreate, ignorando o campo "nome" que virá vazio do frontend no login
    student = authenticate_student(body.matricula, body.senha, db)
    if not student:
        raise HTTPException(status_code=401, detail="Matrícula ou senha incorretos.")
        
    return TokenResponse(
        access_token=create_access_token(student.id),
        student=StudentResponse(
            id=student.id, 
            matricula=student.matricula, 
            nome=student.nome,
            created_at=student.created_at.isoformat(),
            turma_id=student.turma_id
        )
    )

# ── Rotas de perfil do ALUNO ──────────────────────────────────────────────
@router.get("/student/me", response_model=StudentResponse)
def me_student(current: Student = Depends(get_current_student)):
    return _to_student_response(current)

@router.put("/student/me", response_model=StudentResponse)
def update_me_student(
    body: StudentUpdate,
    db: Session = Depends(get_db),
    current: Student = Depends(get_current_student),
):
    current.nome = body.nome.strip()
    db.commit()
    db.refresh(current)
    return _to_student_response(current)

@router.put("/student/me/password", status_code=204)
def change_password_student(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current: Student = Depends(get_current_student),
):
    if not verify_password(body.senha_atual, current.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    current.senha_hash = hash_password(body.senha_nova)
    db.commit()

# Helper para formatar a resposta do aluno
def _to_student_response(s: Student) -> StudentResponse:
    return StudentResponse(
        id=s.id,
        matricula=s.matricula,
        nome=s.nome,
        created_at=s.created_at.isoformat(),
        turma_id=s.turma_id
    )
