import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Redirecta gli utenti "limited" da /home a /preview */
export default function RoleGuard({ children }) {
  const { canAccessHome } = useAuth();
  if (!canAccessHome) return <Navigate to="/preview" replace />;
  return children;
}
