import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'

// Páginas em lazy-load para manter o bundle inicial leve.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterStudentPage = lazy(() => import('./pages/RegisterStudentPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const StudentPage = lazy(() => import('./pages/StudentPage'))
const StudentTurmaPage = lazy(() => import('./pages/StudentTurmaPage'))
const StudentSubmitPage = lazy(() => import('./pages/StudentSubmitPage'))


function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="w-6 h-6 text-purple-600" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Auth */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register-student" element={<RegisterStudentPage />} /> 

            {/* Aluno — protegido */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/student" replace />} />
                
                <Route path="profile" element={<ProfilePage />} />
                <Route path="/student" element={<StudentPage />} />
                <Route path="/student/turma/:turmaId" element={<StudentTurmaPage />} />
                <Route path="/student/exam/:examId" element={<StudentSubmitPage />} />
              </Route>

            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
