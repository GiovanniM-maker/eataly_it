import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading, protectedApp } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-gray-400">Caricamento...</div>
      </div>
    );
  }

  if (protectedApp && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
