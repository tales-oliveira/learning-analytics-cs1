import api from './client'

export const matricularTurma = (codigo) => {
  return api.post('/student/matricular', { codigo });
};

export const getMinhasTurmas = () => {
  return api.get('/student/turmas');
};

export const getTurmaDetail = (turmaId) => {
  return api.get(`/student/turmas/${turmaId}`);
};

export const getExamForStudent = (examId) => {
  return api.get(`/student/exam/${examId}`);
};

export const submitExamFinal = (examId, drafts) => {
  return api.post(`/student/exam/${examId}/submit`, { drafts });
};


export const testStudentCode = (examId, questionNumber, code, withFeedback = false) => {
  return api.post(
    `/student/exam/${examId}/test`,
    { question_number: questionNumber, code },
    { params: { with_feedback: withFeedback } }
  );
};