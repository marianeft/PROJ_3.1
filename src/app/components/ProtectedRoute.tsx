import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../store/AuthContext';

export function ProtectedRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <Outlet />;
}
