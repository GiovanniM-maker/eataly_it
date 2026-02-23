import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (file.size > maxSize) return { valid: false, error: `Troppo grande (${formatFileSize(file.size)}). Max 10MB` };
  if (!allowedTypes.includes(file.type)) return { valid: false, error: 'Solo PNG/JPG supportati' };
  return { valid: true };
};

export default function ImageUploader() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const { authFetch } = useAuth();
  const apiUrl = () => import.meta.env.VITE_API_URL || '';

  const handleFiles = (fileList) => {
    const selectedFiles = Array.from(fileList || []);
    const validatedFiles = [];
    const errors = [];
    selectedFiles.forEach((file) => {
      const v = validateFile(file);
      if (v.valid) validatedFiles.push(file);
      else errors.push({ name: file.name, error: v.error });
    });
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles(validatedFiles);
    setValidationErrors(errors);
    setPreviews(validatedFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name, size: f.size })));
    setResults([]);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const removeAllFiles = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
    setValidationErrors([]);
    setResults([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    const toastId = toast.loading(`Caricamento ${files.length} file...`);
    try {
      const response = await authFetch(`${apiUrl()}/api/upload`, { method: 'POST', body: formData });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      setResults(data.uploads || []);
      if (response.ok) {
        const n = (data.uploads || []).filter((u) => u.success).length;
        toast.success(`${n} file caricati con successo!`, { id: toastId });
        setTimeout(() => { setFiles([]); setPreviews([]); setResults([]); if (inputRef.current) inputRef.current.value = ''; }, 5000);
      } else {
        toast.error(data.error || 'Alcuni file non caricati', { id: toastId });
      }
    } catch (err) {
      setResults([{ name: 'Errore', success: false, error: err.message }]);
      toast.error('Errore durante l\'upload', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const driveFolderId = import.meta.env.VITE_DRIVE_FOLDER_ID || '';
  const hasSuccess = results.length > 0 && results.some((r) => r.success);

  return (
    <section id="upload" className="bg-surface-dark rounded shadow-2xl border border-white/5 p-8">
      <h2 className="text-lg font-bold text-white font-medium mb-4">Carica Immagini</h2>

      <label className="block border border-dashed border-white/10 rounded p-12 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer mb-8">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
        <p className="text-sm font-medium text-gray-400">Trascina i file qui o clicca per sfogliare</p>
        <p className="text-xs text-gray-500 mt-1">PNG, JPG fino a 10MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpeg,.jpg,image/png,image/jpeg,image/jpg"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {validationErrors.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[11px] font-medium text-primary">⚠️ {validationErrors.length} file non validi</p>
          {validationErrors.map((err, i) => (
            <div key={i} className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-gray-300">
              <span className="font-medium">{err.name}</span> — {err.error}
            </div>
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <div className="space-y-6 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-400">File selezionati ({previews.length})</p>
            {previews.length > 1 && (
              <button type="button" onClick={removeAllFiles} className="text-[11px] text-primary hover:underline">
                Rimuovi tutti
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {previews.map((preview, idx) => (
              <div key={idx} className="relative h-20 w-20 rounded bg-white/5 overflow-hidden border border-white/10 group">
                <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Rimuovi"
                >
                  <span className="material-symbols-outlined text-[12px] block">close</span>
                </button>
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-gray-300 truncate px-1 py-0.5">
                  {formatFileSize(preview.size)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {uploading && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                    <span>Caricamento in corso...</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-[2px]">
                    <div className="bg-primary h-full rounded-full w-[80%] animate-progress" />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="bg-primary text-white px-8 py-2 rounded font-medium text-xs tracking-widest uppercase btn-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Caricamento...' : `Carica ${files.length} file`}
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 mb-4">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${r.success ? 'text-green-400' : 'text-red-400'}`}
            >
              <span>{r.success ? '✓' : '✗'}</span>
              <span className="truncate">{r.name}</span>
              {r.error && <span className="text-gray-500 truncate">— {r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {hasSuccess && driveFolderId && (
        <div className="pt-4 border-t border-white/5">
          <a
            href={`https://drive.google.com/drive/folders/${driveFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-lg">folder_open</span>
            Apri cartella Drive
          </a>
        </div>
      )}
    </section>
  );
}
