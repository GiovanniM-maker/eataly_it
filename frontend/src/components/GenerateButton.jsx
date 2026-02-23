import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const apiUrl = () => import.meta.env.VITE_API_URL || '';

export default function GenerateButton() {
  const [status, setStatus] = useState('idle');
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const pendingIdRef = useRef(null);
  const startRef = useRef(null);

  const handleGenerate = async () => {
    setStatus('loading');
    setElapsed(0);
    startRef.current = Date.now();
    const newWorkflowId = `wf_${Date.now()}`;
    pendingIdRef.current = newWorkflowId;
    setWorkflowId(newWorkflowId);
    setWorkflowStatus(null);

    try {
      const response = await fetch(`${apiUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: newWorkflowId }),
      });

      if (response.ok) {
        await fetch(`${apiUrl()}/api/trigger-stat`, { method: 'POST' }).catch(() => {});
        toast.success('Workflow N8N avviato!', { icon: '🚀' });
        setTimeout(() => {
          if (pendingIdRef.current === newWorkflowId) {
            pendingIdRef.current = null;
            setStatus('success');
            setWorkflowId(null);
            setWorkflowStatus(null);
            setTimeout(() => setStatus('idle'), 3000);
          }
        }, 5000);
      } else {
        setStatus('error');
        toast.error('Errore durante l\'avvio del workflow');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Generate error:', error);
      setStatus('error');
      toast.error('Impossibile contattare N8N');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    if (status !== 'loading') return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startRef.current || 0)) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (!workflowId || status !== 'loading') return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl()}/api/workflow-status/${workflowId}`);
        const data = await response.json();
        setWorkflowStatus(data);
        if (data.status === 'completed') {
          pendingIdRef.current = null;
          setStatus('success');
          toast.success('Workflow completato!');
          setTimeout(() => { setWorkflowId(null); setWorkflowStatus(null); setStatus('idle'); }, 3000);
        } else if (data.status === 'error') {
          pendingIdRef.current = null;
          setStatus('error');
          toast.error('Workflow fallito');
          setTimeout(() => { setWorkflowId(null); setWorkflowStatus(null); setStatus('idle'); }, 3000);
        }
      } catch (e) {
        console.error('Status fetch error:', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [workflowId, status]);

  return (
    <section className="bg-surface-dark rounded shadow-2xl border border-white/5 p-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">automation</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-medium leading-tight">
              Avvia Generazione N8N
            </h2>
            <p className="text-sm text-gray-500">
              Esegui il workflow di sincronizzazione automatica
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {status === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[10px] tracking-tight text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span>In esecuzione ({elapsed}s)</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === 'loading'}
            className={`bg-primary text-white px-8 py-2 rounded font-medium text-xs tracking-widest uppercase transition-all ${
              status === 'loading'
                ? 'opacity-70 cursor-not-allowed'
                : status === 'success'
                ? 'bg-green-600'
                : status === 'error'
                ? 'bg-red-600'
                : 'btn-glow hover:opacity-90'
            }`}
          >
            {status === 'loading' && 'In corso...'}
            {status === 'success' && 'Completato'}
            {status === 'error' && 'Errore'}
            {status === 'idle' && 'Genera'}
          </button>
        </div>
      </div>
      {status === 'loading' && workflowStatus?.step && (
        <p className="mt-3 text-xs text-gray-500">{workflowStatus.step}</p>
      )}
    </section>
  );
}
