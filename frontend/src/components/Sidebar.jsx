import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Skeleton from './Skeleton';

const apiUrl = () => import.meta.env.VITE_API_URL || '';

export default function Sidebar() {
  const location = useLocation();
  const isPreviewPage = location.pathname === '/preview';
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [storageQuota, setStorageQuota] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Preview page state
  const [products, setProducts] = useState([]);
  const [viewedProducts, setViewedProducts] = useState(new Set());
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${apiUrl()}/api/stats`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Stats fetch error:', e);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${apiUrl()}/api/activity`);
        const data = await res.json();
        setActivities(data.activities || []);
      } catch (e) {
        console.error('Activity fetch error:', e);
      }
    };
    fetchActivities();
    const interval = setInterval(fetchActivities, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isFirst = true;
    const fetchRecentFiles = async () => {
      if (isFirst) setLoadingFiles(true);
      try {
        const res = await fetch(`${apiUrl()}/api/recent-files`);
        const data = await res.json();
        setRecentFiles(data.files || []);
      } catch (e) {
        console.error('Recent files error:', e);
      } finally {
        setLoadingFiles(false);
        isFirst = false;
      }
    };
    fetchRecentFiles();
    const interval = setInterval(fetchRecentFiles, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch(`${apiUrl()}/api/storage-quota`);
        const data = await res.json();
        setStorageQuota(data);
      } catch (e) {
        console.error('Quota fetch error:', e);
      }
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 60000);
    return () => clearInterval(interval);
  }, []);

  // Preview page: fetch prodotti
  const fetchProducts = async (silent = false) => {
    if (!silent) setLoadingProducts(true);
    try {
      const response = await fetch(`${apiUrl()}/api/products/list`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      if (!silent) setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!isPreviewPage) return;

    fetchProducts();

    const saved = localStorage.getItem('viewedProducts');
    if (saved) {
      try {
        setViewedProducts(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error parsing viewed products:', e);
      }
    }

    // Auto-refresh
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchProducts(true);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isPreviewPage, autoRefresh]);

  const toggleViewed = (sku) => {
    const newViewed = new Set(viewedProducts);
    if (newViewed.has(sku)) {
      newViewed.delete(sku);
    } else {
      newViewed.add(sku);
    }
    setViewedProducts(newViewed);
    localStorage.setItem('viewedProducts', JSON.stringify([...newViewed]));
  };

  const handleSelectProduct = (sku) => {
    setSelectedSKU(sku);
    const newViewed = new Set(viewedProducts);
    newViewed.add(sku);
    setViewedProducts(newViewed);
    localStorage.setItem('viewedProducts', JSON.stringify([...newViewed]));
    window.dispatchEvent(new CustomEvent('selectProduct', { detail: sku }));
  };

  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Ora';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m fa`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    return date.toLocaleDateString('it-IT');
  };

  const fileIcon = (name) => {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'description';
    return 'table_rows';
  };

  const fileIconColor = (name) => {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'text-blue-400';
    if (['pdf'].includes(ext)) return 'text-red-400';
    return 'text-green-400';
  };

  // Filtra prodotti per SKU o nome (ricerca multi-parola: ogni parola deve essere presente)
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true; // Se query vuota, mostra tutti

    // Dividi la query in parole (gestisce spazi multipli)
    const queryWords = query.split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length === 0) return true;

    const sku = (product.sku || '').toLowerCase();
    const nome = (product.nome || '').toLowerCase();

    // Verifica che TUTTE le parole siano presenti nel nome o nello SKU
    return queryWords.every((word) => sku.includes(word) || nome.includes(word));
  });

  return (
    <aside className="fixed top-[64px] left-0 bottom-0 w-[256px] bg-background-dark/50 backdrop-blur-md border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar z-40">
      <div className="p-4 space-y-6">
        <nav className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
          <Link
            to="/home"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/home'
                ? 'text-primary font-medium bg-white/5'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-xl">home</span>
            <span className="text-sm text-gray-200">Home</span>
          </Link>
          <Link
            to="/preview"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/preview'
                ? 'text-primary font-medium bg-white/5'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-xl">visibility</span>
            <span className="text-sm">Preview</span>
          </Link>
        </nav>

        {isPreviewPage ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                PRODOTTI ({filteredProducts.length})
              </p>
              <button
                type="button"
                onClick={() => fetchProducts()}
                disabled={loadingProducts}
                className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 mr-2"
                title="Aggiorna lista"
              >
                <svg
                  className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>

            {/* Barra di ricerca */}
            <div className="px-3 mb-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca per SKU o nome..."
                  className="w-full pl-8 pr-8 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    title="Pulisci ricerca"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center text-xs text-gray-400 mb-3 cursor-pointer hover:text-gray-300 px-3">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="w-3 h-3 mr-2"
              />
              Auto-refresh (30s)
            </label>

            {loadingProducts ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 px-3">Nessun prodotto</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 px-3">Nessun prodotto trovato</p>
            ) : (
              <div className="space-y-2 px-1">
                {filteredProducts.map((product) => (
                  <div
                    key={product.sku}
                    className={`bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors ${
                      selectedSKU === product.sku ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectProduct(product.sku)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium text-white truncate">{product.nome}</p>
                        <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleViewed(product.sku);
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          viewedProducts.has(product.sku)
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {viewedProducts.has(product.sku) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Today Statistics
              </p>
              <div className="grid grid-cols-2 gap-2 px-1">
                <div className="bg-white/5 p-3 rounded border border-white/5">
                  <p className="text-[10px] text-gray-500 font-medium">Upload</p>
                  <p className="text-xl font-bold text-white">{stats?.uploadsToday ?? 0}</p>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/5">
                  <p className="text-[10px] text-gray-500 font-medium">Trigger</p>
                  <p className="text-xl font-bold text-white">{stats?.triggersToday ?? 0}</p>
                </div>
              </div>
            </div>

            {storageQuota && (
              <div className="space-y-2">
                <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Storage Drive
                </p>
                <div className="px-3 space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>{storageQuota.used} GB</span>
                    <span>{storageQuota.limit} GB</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, parseFloat(storageQuota.percentage))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Recent Files
              </p>
              <div className="space-y-1">
                {loadingFiles ? (
                  <>
                    <Skeleton className="h-8 mb-1 bg-white/5" />
                    <Skeleton className="h-8 mb-1 bg-white/5" />
                    <Skeleton className="h-8 bg-white/5" />
                  </>
                ) : recentFiles.length === 0 ? (
                  <p className="px-3 text-xs text-gray-500 italic">Nessun file recente</p>
                ) : (
                  recentFiles.slice(0, 5).map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded group cursor-pointer"
                      title={f.name}
                    >
                      <span className={`material-symbols-outlined text-sm ${fileIconColor(f.name)}`}>
                        {fileIcon(f.name)}
                      </span>
                      <span className="text-xs text-gray-300 truncate">{f.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Activity Feed
              </p>
              <div className="space-y-4 px-3 border-l-2 border-white/10 ml-3">
                {activities.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">Nessuna attività</p>
                ) : (
                  activities.slice(0, 5).map((activity, idx) => (
                    <div key={activity.id ?? idx} className="relative pl-4">
                      <div
                        className={`absolute -left-[11px] top-1 h-3 w-3 rounded-full ${
                          activity.type === 'trigger' ? 'bg-primary' : 'bg-gray-500'
                        }`}
                      />
                      <p className="text-[11px] text-gray-200 font-medium truncate">{activity.message}</p>
                      <p className="text-[10px] text-gray-500">{formatActivityTime(activity.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
