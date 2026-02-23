import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { logout, protectedApp, role } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 h-[64px] glass-effect z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary text-white p-1 rounded">
          <span className="material-symbols-outlined text-lg block">bolt</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight font-light tracking-wide">
          <span className="text-white">POTENT</span>
          <span className="text-primary">IA</span>
          <span className="text-white">L</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {role && (
          <span className="text-xs text-gray-500 uppercase tracking-wider">{role}</span>
        )}
        {protectedApp && (
          <button
            type="button"
            onClick={logout}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            Esci
          </button>
        )}
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/30">
          {role === 'admin' ? 'A' : role === 'limited' ? 'L' : '?'}
        </div>
      </div>
    </header>
  );
}
