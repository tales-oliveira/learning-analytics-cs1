import json
import logging
import re

from openai import OpenAI

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_MODEL = "qwen2.5-coder:7b"


def _numbered(code: str) -> str:
    return "\n".join(f"{i}: {ln}" for i, ln in enumerate((code or "").split("\n"), 1))


def _format_test_context(test_results: list[dict] | None) -> str:
    if not test_results:
        return "  (nenhum caso de teste)"
    linhas = []
    for i, tr in enumerate(test_results, 1):
        status = "PASSOU" if tr.get("passed") else "FALHOU"
        linhas.append(f"  - Caso {i} [{status}]")
        if not tr.get("passed"):
            linhas.append(f"    Entrada:  {tr.get('input', '(vazia)')!r}")
            linhas.append(f"    Esperado: {tr.get('expected_output', '')!r}")
            linhas.append(f"    Obtido:   {tr.get('actual_output', '')!r}")
    return "\n".join(linhas)


def _clean_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [s.strip() for s in value if isinstance(s, str) and s.strip()][:5]


def _sanitize_lines(raw, code: str) -> list[int]:
    max_line = len((code or "").split("\n"))
    out: set[int] = set()
    for v in (raw or []):
        try:
            n = int(v)
        except (TypeError, ValueError):
            continue
        if 1 <= n <= max_line:
            out.add(n)
    return sorted(out)


def _empty_feedback(error: str | None = None) -> dict:
    return {
        "overall": "",
        "pontos_fortes": [],
        "melhorias": [],
        "next_steps": "",
        "highlight_lines": [],
        "error": error,
    }


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Modelo devolveu texto não-JSON: %r", text[:200])
        return {}
    return data if isinstance(data, dict) else {}


# ── feedback em lote ────────────────────────────────────────────────────────
def generate_student_feedback_batch(questions: list[dict]) -> dict[str, dict]:
    if not questions:
        return {}

    # ── monta um único bloco com todas as questões ──────────────────────────
    blocos = []
    for q in questions:
        codigo_bloco = "```c\n" + _numbered(q.get("student_code", "")) + "\n```"

        if q.get("compile_error"):
            comp = "NÃO COMPILOU. Erro do compilador:\n```\n" + q["compile_error"] + "\n```"
        else:
            comp = "Compilou com sucesso."

        testes = _format_test_context(q.get("test_results"))

        blocos.append(
            f"\n═══════════ QUESTÃO {q['number']} ═══════════\n"
            f"Enunciado:\n{q.get('question_statement', '')}\n\n"
            f"Código do aluno (numerado por linha):\n{codigo_bloco}\n\n"
            f"Status da compilação: {comp}\n\n"
            f"Resultado dos testes:\n{testes}\n"
        )

    corpo = "\n".join(blocos)

    prompt = """
    Você é um assistente pedagógico especializado em ensino de programação introdutória em C.

    Você receberá várias questões resolvidas pelo mesmo aluno. Gere um feedback personalizado para cada questão, individualmente.

    Regras gerais (valem para todas as questões):
    - NÃO entregue a solução pronta, guie o aluno a descobrir o problema.
    - Se o código está correto, aponte os pontos positivos.
    - Se o código está incorreto, aponte a linha e explique o conceito por trás do problema, mas sem dar a resposta.
    - Utilize inguagem acessível, em português.
    - Seja específico ao código do aluno, não genérico.
    - Em pontos_fortes e melhorias, use no máximo 3 itens cada.

    Retorne APENAS um JSON com uma chave feedbacks, contendo uma lista com um item por questão:
    {
    "feedbacks": [
        {
        "number": "<número da questão como veio no bloco>",
        "overall": "<comentário geral, 2-3 frases>",
        "pontos_fortes": ["<ponto forte>"],
        "melhorias": ["<ponto a melhorar>"],
        "next_steps": "<sugestão de estudo>",
        "highlight_lines": [<números de linha>]
        }
    ]
    }
    """ + corpo


    try:    
        logger.info("═══ PROMPT ENVIADO AO OLLAMA (primeiros 800 chars) ═══\n%s", prompt[:800])

        client = OpenAI(
            base_url=OLLAMA_BASE_URL,
            api_key="ollama",
        )

        response = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        
        text = response.choices[0].message.content

        logger.info("═══ RESPOSTA CRUA DO OLLAMA ═══\n%s", (text or "")[:800])

        if not text:
            logger.warning("Resposta vazia do Ollama para feedback em lote.")
            return {
                str(q["number"]): _empty_feedback("Resposta vazia do modelo.")
                for q in questions
            }

        data = _parse_json(text)
        lista = data.get("feedbacks") if isinstance(data.get("feedbacks"), list) else []

        # Indexa por number (string) para casar com a chave esperada pelo frontend
        por_numero = {str(item.get("number")): item for item in lista if isinstance(item, dict)}

        resultado: dict[str, dict] = {}
        for q in questions:
            key = str(q["number"])
            item = por_numero.get(key, {})
            resultado[key] = {
                "overall": (item.get("overall") or "").strip(),
                "pontos_fortes": _clean_list(item.get("pontos_fortes")),
                "melhorias": _clean_list(item.get("melhorias")),
                "next_steps": (item.get("next_steps") or "").strip(),
                "highlight_lines": _sanitize_lines(item.get("highlight_lines"), q.get("student_code", "")),
            }

        return resultado

    except Exception as e:
        logger.exception("Falha ao gerar feedback em lote via Ollama: %s", e)
        return {str(q["number"]): _empty_feedback(str(e)) for q in questions}


# ── feedback individual ─────────────────────────────────────────────────────
def generate_student_feedback(
    *,
    question_statement: str,
    student_code: str,
    compile_error: str = "",
    test_results: list[dict] | None = None,
) -> dict:
    """Wrapper individual — usa o batch com uma única questão.
    Nunca levanta exceção."""
    resultado = generate_student_feedback_batch([
        {
            "number": "1",
            "question_statement": question_statement,
            "student_code": student_code,
            "compile_error": compile_error,
            "test_results": test_results,
        }
    ])
    return resultado.get("1", _empty_feedback("Resposta inesperada."))