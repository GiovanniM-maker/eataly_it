import { useState, useEffect, useRef, useCallback } from 'react';

const apiUrl = () => import.meta.env.VITE_API_URL || '';
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 60;
const INDEX_COL_WIDTH = 48;

export default function DocButton() {
  const [sheetData, setSheetData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingCol, setResizingCol] = useState(null);
  const resizeStartRef = useRef({ x: 0, width: 0 });
  const prevRowCount = useRef(0);
  const tableRef = useRef(null);

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl()}/api/sheet-data`);
      const text = await response.text();
      let data = { values: [], lastUpdate: null };
      if (text) try { data = JSON.parse(text); } catch { setSheetData([]); setLoading(false); return; }
      if (!response.ok) { setSheetData([]); setLoading(false); return; }
      const wasAtBottom = tableRef.current
        ? tableRef.current.scrollHeight - tableRef.current.scrollTop <= tableRef.current.clientHeight + 50
        : true;
      setSheetData(data.values || []);
      setLastUpdate(data.lastUpdate || null);
      if ((data.values?.length || 0) > prevRowCount.current && wasAtBottom) {
        setTimeout(() => { if (tableRef.current) tableRef.current.scrollTop = tableRef.current.scrollHeight; }, 100);
      }
      prevRowCount.current = (data.values || []).length;
    } catch (err) {
      setSheetData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (showPreview) fetchSheetData(); }, [showPreview]);
  useEffect(() => {
    if (!autoRefresh || !showPreview) return;
    const interval = setInterval(fetchSheetData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, showPreview]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 10) return 'Ora';
    if (diffSecs < 60) return `${diffSecs}s fa`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m fa`;
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenSheet = () => window.open(import.meta.env.VITE_GOOGLE_DOC_URL, '_blank');

  const headers = sheetData[0] || [];
  const rows = sheetData.slice(1);

  // Inizializza larghezze colonne quando cambiano gli header
  useEffect(() => {
    if (headers.length === 0) return;
    setColumnWidths((prev) => {
      const next = { ...prev };
      headers.forEach((_, i) => {
        if (next[i] == null) next[i] = DEFAULT_COL_WIDTH;
      });
      return next;
    });
  }, [headers.length]);

  // Resize colonne: drag
  const handleResizeStart = useCallback((colIdx, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = {
      x: e.clientX,
      width: columnWidths[colIdx] ?? DEFAULT_COL_WIDTH,
    };
    setResizingCol(colIdx);
  }, [columnWidths]);

  useEffect(() => {
    if (resizingCol == null) return;
    const handleMove = (e) => {
      const { x, width } = resizeStartRef.current;
      const delta = e.clientX - x;
      const newWidth = Math.max(MIN_COL_WIDTH, width + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
    };
    const handleUp = () => setResizingCol(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingCol]);

  const getColWidth = (colIdx) => {
    if (colIdx === -1) return INDEX_COL_WIDTH; // colonna #
    return columnWidths[colIdx] ?? DEFAULT_COL_WIDTH;
  };

  return (
    <section id="sheets" className="bg-surface-dark rounded-[30px] shadow-2xl border border-white/5 p-8 overflow-hidden" style={{ borderRadius: '30px' }}>
      <div className="p-6 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-white font-medium leading-tight">
              Foglio Dati Google
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {sheetData.length > 0 ? `${rows.length} righe` : 'Nessun dato'}
              {lastUpdate && ` • Aggiornato ${formatTime(lastUpdate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-primary hover:underline"
          >
            {showPreview ? 'Nascondi preview' : 'Mostra preview'}
          </button>
          {showPreview && (
            <>
              <label className="flex items-center text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2 rounded border-white/20 bg-white/5 text-primary"
                />
                Auto-refresh (5s)
              </label>
              <button
                type="button"
                onClick={fetchSheetData}
                disabled={loading}
                className="text-xs text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                Aggiorna
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleOpenSheet}
            className="flex items-center gap-2 border border-white/10 text-white px-4 py-2 rounded font-medium text-xs hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Apri Sheet
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading && sheetData.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">Caricamento...</div>
          ) : sheetData.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">Nessun dato nel foglio</div>
          ) : (
            <>
              <div className="overflow-hidden" style={{ borderRadius: '0 0 30px 30px' }}>
                <div ref={tableRef} className="overflow-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
                <table className="w-full border-collapse text-left text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: `${INDEX_COL_WIDTH}px` }} />
                    {headers.map((_, i) => (
                      <col key={i} style={{ width: `${getColWidth(i)}px` }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 bg-[#34a853] border-b border-gray-300 z-10">
                    <tr>
                      <th className="px-2 py-2 font-semibold text-white text-xs">#</th>
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-2 font-semibold text-white text-xs relative group">
                          <span className="block truncate pr-1">{h || `Colonna ${i + 1}`}</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-white/40 flex-shrink-0 select-none"
                            onMouseDown={(e) => handleResizeStart(i, e)}
                            title="Trascina per ridimensionare"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="bg-white hover:bg-gray-50 transition-colors border-b border-gray-200">
                        <td className="px-2 py-1.5 text-gray-500 font-mono text-[10px]">{rowIdx + 1}</td>
                        {headers.map((_, colIdx) => (
                          <td key={colIdx} className="px-2 py-1.5 text-gray-900 text-xs max-w-0">
                            <span className="block truncate" title={row[colIdx] ?? '-'}>
                              {row[colIdx] ?? '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>Scroll per vedere tutti i dati</span>
                <span>{rows.length} righe • {headers.length} colonne</span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
