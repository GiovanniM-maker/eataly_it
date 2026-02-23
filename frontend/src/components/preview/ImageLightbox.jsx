/**
 * Lightbox per visualizzare immagini a schermo intero con zoom
 */
export default function ImageLightbox({ src, alt = '', onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Immagine ingrandita"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Chiudi"
      >
        <span className="material-symbols-outlined text-2xl">close</span>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
