import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

export default function Header() {
  const { logout, protectedApp, role } = useAuth();
  const { toggle } = useSidebar();
  const navigate = useNavigate();

  const handleSwitchAccount = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-[64px] glass-effect z-50 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Apri menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div className="bg-primary text-white p-1 rounded">
          <span className="material-symbols-outlined text-lg block">bolt</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight font-light tracking-wide">
          <span className="text-white">POTENT</span>
          <span className="text-primary">IA</span>
          <span className="text-white">L</span>
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {role && (
          <span className="hidden sm:inline text-xs text-gray-500 uppercase tracking-wider">{role}</span>
        )}
        {protectedApp && (
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            Esci
          </button>
        )}
        <button
          type="button"
          onClick={handleSwitchAccount}
          className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/30 hover:bg-primary/30 transition-colors cursor-pointer"
          title="Cambia account"
          aria-label="Cambia account"
        >
          {role === 'admin' ? 'A' : role === 'limited' ? 'L' : '?'}
        </button>
      </div>
    </header>
  );
}
