import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const apiUrl = () => import.meta.env.VITE_API_URL || '';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_COMMENTS_WEBHOOK_URL || 'https://giovannimavilla.app.n8n.cloud/webhook/cde25c0d-51b7-4c73-b1b0-04501a9c4b76';

/**
 * Formatta data in formato assoluto italiano
 */
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Modal per inserire commenti su sezioni specifiche
 */
export default function CommentModal({ sectionKey, currentText, productId, onClose, onCommentSent }) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingComments, setExistingComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Carica commenti esistenti al mount
  useEffect(() => {
    fetchComments();
  }, [productId, sectionKey]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const url = `${apiUrl()}/api/comments/${productId}?section=${sectionKey}`;
      console.log('🔍 Fetching comments from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ HTTP ${response.status} from ${url}:`, text.substring(0, 200));
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log('📝 Comments response:', data);
      setExistingComments(data.items || []);
    } catch (err) {
      console.error('❌ Error fetching comments:', err);
      console.error('   URL attempted:', `${apiUrl()}/api/comments/${productId}?section=${sectionKey}`);
      setExistingComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Il commento non può essere vuoto');
      return;
    }

    setIsSubmitting(true);

    try {
      // Payload come array con un singolo oggetto
      const payload = [{
        id: crypto.randomUUID(),
        product_id: productId,
        section: sectionKey,
        current_text: currentText,
        comment: comment.trim(),
        page_url: window.location.href,
        time_stamp: new Date().toISOString(),
      }];

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Commento inviato con successo!');
        setComment('');
        
        // Flow corretto: toast → onCommentSent → onClose
        if (onCommentSent) {
          onCommentSent(sectionKey);
        }
        onClose();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Errore invio commento:', error);
      toast.error('Errore nell\'invio del commento. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay scuro */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Commenti</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Chiudi"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Commenti precedenti */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commenti precedenti</h3>
            
            {loadingComments ? (
              <div className="text-center py-4 text-gray-500">Caricamento...</div>
            ) : existingComments.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nessun commento ancora</p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {existingComments.map((item) => (
                  <div key={item.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <p className="text-gray-700 mb-2">{item.comment}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.time_stamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sezione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sezione
              </label>
              <input
                type="text"
                value={sectionKey}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Testo attuale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Testo attuale
              </label>
              <textarea
                value={currentText}
                readOnly
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed resize-none"
              />
            </div>

            {/* Commento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commento <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={6}
                placeholder="Inserisci il tuo commento..."
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Invio in corso...
                  </>
                ) : (
                  'Invia'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
