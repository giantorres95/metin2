import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AccountList from './pages/AccountList';
import AdminPanel from './pages/AdminPanel';

function LoginGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading…</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/accounts" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginGuard />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/accounts" element={<AccountList />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
