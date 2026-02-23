import { useState, useEffect, useRef } from 'react';
import CommentableSection from './CommentableSection';
import ImageLightbox from './ImageLightbox';
import { COMMENT_SECTIONS } from '../../constants/commentSections';
import { useAuth } from '../../context/AuthContext';

const apiUrl = () => import.meta.env.VITE_API_URL || '';

export default function EatalyProductPage({ sku }) {
  const { authFetch } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prodotto');
  const [commentCounts, setCommentCounts] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // { src, alt }
  const pollingTimeoutRef = useRef(null);

  // Cleanup quando cambia SKU (nuovo prodotto)
  useEffect(() => {
    // Cancella polling attivo quando cambia prodotto
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    // Resetta i comment counts per il nuovo prodotto
    setCommentCounts({});
  }, [sku]);

  useEffect(() => {
    fetchProduct();
  }, [sku]);

  // Fetch comment summary dopo caricamento prodotto
  useEffect(() => {
    if (product?.sku) {
      // Invalida cache per assicurarsi di avere dati freschi per il nuovo prodotto
      authFetch(`${apiUrl()}/api/comments/invalidate/${product.sku}`, { method: 'POST' }).catch(() => {});
      // Fetch immediato senza delay
      fetchCommentSummary(product.sku);
    }
  }, [product?.sku]);

  // Cleanup timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Chiudi lightbox con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    if (lightboxImage) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [lightboxImage]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${apiUrl()}/api/product/${sku}`);
      const data = await response.json();
      console.log('📦 Dati prodotto ricevuti:', data.product);
      console.log('📷 Immagine principale:', data.product.mainImage);
      console.log('🥗 Immagini nutrizionali:', data.product.nutritionalImages);
      
      if (data.product.mainImage) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/4d0d2b22-9f37-4c1e-ae7c-756ed5f862aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EatalyProductPage.jsx:fetchProduct',message:'mainImage URL received',data:{mainImage:data.product.mainImage,isRelative:data.product.mainImage.startsWith('/'),sku},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.log('✅ URL immagine principale ricevuto:', data.product.mainImage);
        console.log('   Tipo:', typeof data.product.mainImage);
        console.log('   Lunghezza:', data.product.mainImage.length);
      } else {
        console.warn('⚠️ Nessuna immagine principale ricevuta dal backend');
      }
      setProduct(data.product);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommentSummary = async (productSku) => {
    try {
      setLoadingComments(true);
      const url = `${apiUrl()}/api/comments/summary/${productSku}`;
      console.log('🔍 Fetching comment summary from:', url);
      
      const response = await authFetch(url);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ HTTP ${response.status} from ${url}:`, text.substring(0, 200));
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log('📊 Comment summary response:', data);
      setCommentCounts(data.counts || {});
      console.log('📊 Comment counts set:', data.counts);
    } catch (err) {
      console.error('❌ Error fetching comment summary:', err);
      console.error('   URL attempted:', `${apiUrl()}/api/comments/summary/${productSku}`);
      console.error('   apiUrl() returns:', apiUrl());
      // Silenzioso, non blocca UI
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSent = async (sectionKey) => {
    // Cancella eventuale polling precedente
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    
    // Aggiornamento ottimistico
    setCommentCounts(prev => {
      const currentCount = prev[sectionKey] || 0;
      const newCount = currentCount + 1;
      
      console.log(`📝 Update ottimistico per ${sectionKey}: ${currentCount} → ${newCount}`);
      
      return {
        ...prev,
        [sectionKey]: newCount
      };
    });
    
    // Invalida cache backend
    try {
      await authFetch(`${apiUrl()}/api/comments/invalidate/${product.sku}`, { method: 'POST' });
    } catch (err) {
      console.error('Error invalidating cache:', err);
    }
    
    // Polling intelligente: controlla ogni 1 secondo per max 15 secondi
    let attempts = 0;
    const maxAttempts = 15;
    let isPollingActive = true;
    
    const poll = async () => {
      if (!isPollingActive) {
        return; // Polling fermato
      }
      
      attempts++;
      
      try {
        const url = `${apiUrl()}/api/comments/summary/${product.sku}`;
        const response = await authFetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const actualCount = data.counts?.[sectionKey] || 0;
          
          // Usa setCommentCounts per leggere lo stato corrente e confrontarlo
          setCommentCounts(prev => {
            const currentExpected = prev[sectionKey] || 0;
            
            console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} - Section: ${sectionKey}, Expected: ${currentExpected}, Actual: ${actualCount}`);
            
            // Se il count dal server è >= al count atteso corrente, aggiorna tutto e ferma il polling
            if (actualCount >= currentExpected) {
              console.log(`✅ Commento trovato nel Sheet per ${sectionKey}, aggiorno counts`);
              isPollingActive = false;
              if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
              }
              // Aggiorna con tutti i counts dal server (potrebbe includere altri commenti)
              return data.counts || {};
            }
            
            // Continua con lo stato corrente (mantiene l'update ottimistico)
            return prev;
          });
          
          // Se abbiamo trovato il commento, ferma il polling
          if (!isPollingActive) {
            return;
          }
        }
      } catch (err) {
        console.error('Error polling comment summary:', err);
      }
      
      // Continua polling se non abbiamo raggiunto il max e il polling è ancora attivo
      if (attempts < maxAttempts && isPollingActive) {
        pollingTimeoutRef.current = setTimeout(poll, 1000); // 1 secondo
      } else {
        console.log(`⏱️ Polling timeout raggiunto per ${sectionKey} (${attempts} tentativi), mantengo update ottimistico`);
        isPollingActive = false;
        pollingTimeoutRef.current = null;
      }
    };
    
    // Inizia polling dopo 1 secondo (dà tempo a N8N di iniziare il salvataggio)
    pollingTimeoutRef.current = setTimeout(poll, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-xl text-gray-700">Prodotto non trovato</p>
      </div>
    );
  }

  const tabs = [
    { id: 'prodotto', label: 'Il prodotto', show: !!product.descrizione },
    { id: 'fornito', label: 'Fornito da', show: !!product.fornitoDa },
    {
      id: 'etichetta',
      label: 'Etichetta',
      show: !!(product.inci || product.ingredienti || product.nutritionalImages?.length),
    },
    { id: 'dettagli', label: 'Dettagli', show: true },
  ].filter((tab) => tab.show);

  // Helper per generare sectionKey dell'immagine principale
  const getImageSectionKey = () => {
    if (!product.mainImageFileName) return 'Immagine_principale_sconosciuta';
    // Sanitizza il nome file: rimuovi caratteri speciali, mantieni solo alfanumerici e underscore
    const sanitized = product.mainImageFileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_') // Rimuovi underscore multipli
      .substring(0, 100); // Limita lunghezza
    return `Immagine_principale_${sanitized}`;
  };

  // Helper per generare sectionKey delle immagini nutrizionali
  const getNutritionalImageSectionKey = (fileName, index) => {
    if (!fileName) return `Etichetta_nutrizionale_sconosciuta_${index}`;
    // Sanitizza il nome file: rimuovi caratteri speciali, mantieni solo alfanumerici e underscore
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_') // Rimuovi underscore multipli
      .substring(0, 100); // Limita lunghezza
    return `Etichetta_nutrizionale_${sanitized}`;
  };

  const imageSectionKey = product.mainImage ? getImageSectionKey() : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" style={{ 
      fontFamily: 'Nunito,sans-serif',
      fontSize: '15px',
      fontWeight: 300,
      lineHeight: 1.5,
      color: 'rgba(0,0,0,.87)'
    }}>
      {/* Grid prodotto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Immagine */}
        <div className="flex justify-center">
          {product.mainImage && imageSectionKey ? (
            <CommentableSection
              sectionKey={imageSectionKey}
              productId={product.sku}
              currentText={product.mainImageFileName || 'Immagine principale'}
              commentCount={commentCounts[imageSectionKey] || 0}
              onCommentSent={handleCommentSent}
            >
              <div className="relative inline-block">
                <img 
                  src={product.mainImage} 
                  alt={product.nome}
                  className="max-w-md w-full h-auto object-contain"
                  onLoad={() => {
                    console.log('✅ Immagine caricata con successo:', product.mainImage);
                  }}
                  onError={(e) => {
                    console.error('❌ Errore caricamento immagine:', product.mainImage);
                    console.error('   Evento errore:', e);
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="20" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage({ src: product.mainImage, alt: product.nome });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                  title="Ingrandisci"
                  aria-label="Ingrandisci immagine"
                >
                  <span className="material-symbols-outlined text-lg">zoom_in</span>
                </button>
              </div>
            </CommentableSection>
          ) : (
            <div className="w-full max-w-md h-96 bg-gray-100 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 text-sm">Immagine non disponibile</p>
            </div>
          )}
        </div>

        {/* Info prodotto */}
        <div>
          <CommentableSection
            sectionKey={COMMENT_SECTIONS.PRODUCT_NAME}
            currentText={product.nome || 'Nome prodotto'}
            productId={product.sku}
            commentCount={commentCounts[COMMENT_SECTIONS.PRODUCT_NAME] || 0}
            onCommentSent={handleCommentSent}
          >
            <h1 className="text-3xl font-normal text-gray-900 mb-2">{product.nome || 'Nome prodotto'}</h1>
          </CommentableSection>

          <CommentableSection
            sectionKey={COMMENT_SECTIONS.PRODUCT_BRAND}
            currentText={product.brand || 'Brand'}
            productId={product.sku}
            commentCount={commentCounts[COMMENT_SECTIONS.PRODUCT_BRAND] || 0}
            onCommentSent={handleCommentSent}
          >
            <h2 className="text-xl text-gray-500 mb-4">{product.brand || 'Brand'}</h2>
          </CommentableSection>
          
          <div className="inline-block px-4 py-1 border-2 border-green-600 text-green-600 text-sm font-semibold mb-4 rounded">
            DISPONIBILE
          </div>

          {/* SHORT DESCRIPTION */}
          {product.shortDescription && (
            <CommentableSection
              sectionKey={COMMENT_SECTIONS.SHORT_DESCRIPTION}
              currentText={product.shortDescription}
              productId={product.sku}
              commentCount={commentCounts[COMMENT_SECTIONS.SHORT_DESCRIPTION] || 0}
              onCommentSent={handleCommentSent}
            >
              <div className="mb-6">
                <p className="text-gray-700 leading-relaxed">{product.shortDescription}</p>
              </div>
            </CommentableSection>
          )}

          <div className="mt-6">
            <button className="w-full py-3 px-6 border-2 border-orange-500 text-orange-500 font-semibold rounded-full hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              AGGIUNGI
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'prodotto' && (
          <div className="prose max-w-none">
            {product.descrizione ? (
              <CommentableSection
                sectionKey={COMMENT_SECTIONS.PRODUCT_DESCRIPTION}
                currentText={product.descrizione.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}
                productId={product.sku}
                commentCount={commentCounts[COMMENT_SECTIONS.PRODUCT_DESCRIPTION] || 0}
                onCommentSent={handleCommentSent}
              >
                <div dangerouslySetInnerHTML={{ __html: product.descrizione.replace(/\n/g, '<br>') }} />
              </CommentableSection>
            ) : (
              <p className="text-gray-500 italic">Descrizione non disponibile</p>
            )}
          </div>
        )}
        
        {activeTab === 'fornito' && (
          <div className="prose max-w-none">
            {product.fornitoDa ? (
              <CommentableSection
                sectionKey={COMMENT_SECTIONS.SUPPLIER_INFO}
                currentText={product.fornitoDa.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}
                productId={product.sku}
                commentCount={commentCounts[COMMENT_SECTIONS.SUPPLIER_INFO] || 0}
                onCommentSent={handleCommentSent}
              >
                <div dangerouslySetInnerHTML={{ __html: product.fornitoDa.replace(/\n/g, '<br>') }} />
              </CommentableSection>
            ) : (
              <p className="text-gray-500 italic">Informazioni sul fornitore non disponibili</p>
            )}
          </div>
        )}
        
        {activeTab === 'etichetta' && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900">{product.nome}</h3>
            
            {product.inci && (
              <CommentableSection
                sectionKey={COMMENT_SECTIONS.INCI}
                currentText={product.inci}
                productId={product.sku}
                commentCount={commentCounts[COMMENT_SECTIONS.INCI] || 0}
                onCommentSent={handleCommentSent}
              >
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">INCI</h4>
                  <p className="text-gray-600">{product.inci}</p>
                </div>
              </CommentableSection>
            )}
            
            {product.ingredienti && (
              <CommentableSection
                sectionKey={COMMENT_SECTIONS.INGREDIENTS}
                currentText={product.ingredienti}
                productId={product.sku}
                commentCount={commentCounts[COMMENT_SECTIONS.INGREDIENTS] || 0}
                onCommentSent={handleCommentSent}
              >
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Ingredienti</h4>
                  <p className="text-gray-600">{product.ingredienti}</p>
                </div>
              </CommentableSection>
            )}
            
            {product.nutritionalImages && product.nutritionalImages.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Etichette nutrizionali</h4>
                <div className="grid grid-cols-2 gap-4">
                  {product.nutritionalImages.map((img, idx) => {
                    const nutritionalSectionKey = getNutritionalImageSectionKey(img.fileName, idx);
                    return (
                      <CommentableSection
                        key={idx}
                        sectionKey={nutritionalSectionKey}
                        productId={product.sku}
                        currentText={img.fileName || `Etichetta ${idx + 1}`}
                        commentCount={commentCounts[nutritionalSectionKey] || 0}
                        onCommentSent={handleCommentSent}
                      >
                        <div className="relative border rounded-lg overflow-hidden bg-white shadow-sm">
                          <img 
                            src={img.url} 
                            alt={`Etichetta ${idx + 1}`} 
                            className="w-full h-auto"
                            onError={(e) => {
                              e.target.parentElement.innerHTML = '<div class="p-8 text-center text-gray-400">Immagine non disponibile</div>';
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage({ src: img.url, alt: `Etichetta ${idx + 1}` });
                            }}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                            title="Ingrandisci"
                            aria-label="Ingrandisci immagine"
                          >
                            <span className="material-symbols-outlined text-sm">zoom_in</span>
                          </button>
                        </div>
                      </CommentableSection>
                    );
                  })}
                </div>
              </div>
            )}
            
            {product.disclaimer && (
              <CommentableSection
                sectionKey={COMMENT_SECTIONS.DISCLAIMER}
                currentText={product.disclaimer}
                productId={product.sku}
                commentCount={commentCounts[COMMENT_SECTIONS.DISCLAIMER] || 0}
                onCommentSent={handleCommentSent}
              >
                <div className="bg-gray-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-xs text-gray-600 leading-relaxed">{product.disclaimer}</p>
                </div>
              </CommentableSection>
            )}
          </div>
        )}
        
        {activeTab === 'dettagli' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-semibold text-gray-700 w-1/3">SKU</td>
                  <td className="py-4 px-6 text-gray-900">
                    <CommentableSection
                      sectionKey={COMMENT_SECTIONS.SKU}
                      currentText={product.sku}
                      productId={product.sku}
                      commentCount={commentCounts[COMMENT_SECTIONS.SKU] || 0}
                      onCommentSent={handleCommentSent}
                    >
                      <span>{product.sku}</span>
                    </CommentableSection>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-semibold text-gray-700">Fornito da</td>
                  <td className="py-4 px-6 text-gray-900">
                    <CommentableSection
                      sectionKey={COMMENT_SECTIONS.SUPPLIER_DETAIL}
                      currentText={product.fornitoDa ? product.fornitoDa.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') : '-'}
                      productId={product.sku}
                      commentCount={commentCounts[COMMENT_SECTIONS.SUPPLIER_DETAIL] || 0}
                      onCommentSent={handleCommentSent}
                    >
                      {product.fornitoDa ? (
                        <div dangerouslySetInnerHTML={{ __html: product.fornitoDa.replace(/\n/g, '<br>') }} />
                      ) : (
                        <span>-</span>
                      )}
                    </CommentableSection>
                  </td>
                </tr>
                {product.paese && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Paese del produttore</td>
                    <td className="py-4 px-6 text-gray-900">
                      <CommentableSection
                        sectionKey={COMMENT_SECTIONS.COUNTRY}
                        currentText={product.paese}
                        productId={product.sku}
                        commentCount={commentCounts[COMMENT_SECTIONS.COUNTRY] || 0}
                        onCommentSent={handleCommentSent}
                      >
                        <span>{product.paese}</span>
                      </CommentableSection>
                    </td>
                  </tr>
                )}
                {product.regione && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Regione del produttore</td>
                    <td className="py-4 px-6 text-gray-900">
                      <CommentableSection
                        sectionKey={COMMENT_SECTIONS.REGION}
                        currentText={product.regione}
                        productId={product.sku}
                        commentCount={commentCounts[COMMENT_SECTIONS.REGION] || 0}
                        onCommentSent={handleCommentSent}
                      >
                        <span>{product.regione}</span>
                      </CommentableSection>
                    </td>
                  </tr>
                )}
                {product.gradazione && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Gradazione alcolica</td>
                    <td className="py-4 px-6 text-gray-900">
                      <CommentableSection
                        sectionKey={COMMENT_SECTIONS.ALCOHOL_CONTENT}
                        currentText={product.gradazione}
                        productId={product.sku}
                        commentCount={commentCounts[COMMENT_SECTIONS.ALCOHOL_CONTENT] || 0}
                        onCommentSent={handleCommentSent}
                      >
                        <span>{product.gradazione}</span>
                      </CommentableSection>
                    </td>
                  </tr>
                )}
                {product.prezzoPer && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Prezzo per unità di misura</td>
                    <td className="py-4 px-6 text-gray-900">
                      <CommentableSection
                        sectionKey={COMMENT_SECTIONS.PRICE_PER_UNIT}
                        currentText={product.prezzoPer}
                        productId={product.sku}
                        commentCount={commentCounts[COMMENT_SECTIONS.PRICE_PER_UNIT] || 0}
                        onCommentSent={handleCommentSent}
                      >
                        <span>{product.prezzoPer}</span>
                      </CommentableSection>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
