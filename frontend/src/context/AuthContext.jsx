import { createContext, useContext, useState, useEffect } from 'react';

const apiUrl = () => import.meta.env.VITE_API_URL || '';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [role, setRole] = useState(() => localStorage.getItem('auth_role'));
  const [loading, setLoading] = useState(true);
  const [protectedApp, setProtectedApp] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${apiUrl()}/api/auth/check`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProtectedApp(data.protected ?? false);
        if (data.protected && !data.valid) {
          setToken(null);
          setRole(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_role');
        } else if (data.role) {
          setRole(data.role);
        }
      })
      .catch(() => {
        setToken(null);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (password) => {
    const res = await fetch(`${apiUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fallito');
    setToken(data.token);
    setRole(data.role || null);
    localStorage.setItem('auth_token', data.token);
    if (data.role) localStorage.setItem('auth_role', data.role);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
  };

  const authFetch = (url, opts = {}) => {
    const headers = { ...opts.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  };

  const canAccessHome = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        login,
        logout,
        loading,
        protectedApp,
        authFetch,
        canAccessHome,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
