import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Module from './pages/Module';
import PlacementQuiz from './pages/PlacementQuiz';
import CaseStudy from './pages/CaseStudy';
import SandboxButton from './components/SandboxButton';

function AuthenticatedSandboxButton() {
  const { user } = useAuth();
  if (!user) return null;
  return <SandboxButton />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AuthenticatedSandboxButton />
          <Routes>
            <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/module/:id"
            element={
              <ProtectedRoute>
                <Module />
              </ProtectedRoute>
            }
          />
          <Route
            path="/placement/:pathId"
            element={
              <ProtectedRoute>
                <PlacementQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/case-study/:pathId"
            element={
              <ProtectedRoute>
                <CaseStudy />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
