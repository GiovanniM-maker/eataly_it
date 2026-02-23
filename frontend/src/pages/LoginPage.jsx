import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(password);
      toast.success('Accesso effettuato');
      navigate('/preview', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Password errata');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-effect rounded-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-1">
              <span className="text-white">POTENT</span>
              <span className="text-primary">IA</span>
              <span className="text-white">L</span>
            </h1>
            <p className="text-gray-400 text-sm">Inserisci la password</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-primary focus:outline-none"
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Accesso...' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
