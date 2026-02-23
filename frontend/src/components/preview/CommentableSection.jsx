import { useState } from 'react';
import CommentModal from './CommentModal';

/**
 * Componente wrapper per sezioni commentabili
 * 
 * @param {string} sectionKey - Chiave statica della sezione (es: "product_name")
 * @param {string} currentText - Testo attuale della sezione da mostrare nel modal
 * @param {string} productId - SKU del prodotto
 * @param {number} commentCount - Numero di commenti per questa sezione
 * @param {function} onCommentSent - Callback chiamato dopo invio commento (riceve sectionKey)
 * @param {React.ReactNode} children - Contenuto della sezione da wrappare
 */
export default function CommentableSection({ 
  sectionKey, 
  currentText, 
  productId, 
  commentCount = 0,
  onCommentSent,
  children 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCommentSent = (sentSectionKey) => {
    if (onCommentSent) {
      onCommentSent(sentSectionKey);
    }
    handleCloseModal();
  };

  // Determina classe border in base a hover e commentCount
  const getBorderClass = () => {
    if (isHovered) {
      return 'border-2 border-primary bg-primary/5 rounded cursor-pointer -m-0.5 p-0.5';
    }
    if (commentCount > 0) {
      return 'border-2 border-primary rounded -m-0.5 p-0.5';
    }
    return 'border-2 border-transparent rounded -m-0.5 p-0.5';
  };

  return (
    <>
      <div
        className={`relative transition-all duration-200 ${getBorderClass()}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {children}
        
        {/* Badge count angolo superiore destro */}
        {commentCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
            {commentCount}
          </span>
        )}
      </div>

      {isModalOpen && (
        <CommentModal
          sectionKey={sectionKey}
          currentText={currentText || ''}
          productId={productId}
          onClose={handleCloseModal}
          onCommentSent={handleCommentSent}
        />
      )}
    </>
  );
}
