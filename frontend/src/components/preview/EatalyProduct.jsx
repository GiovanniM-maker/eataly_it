import { useState } from 'react';

export default function EatalyProduct({ product }) {
  const [activeTab, setActiveTab] = useState('prodotto');

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <nav className="text-xs text-gray-500 mb-6 flex items-center gap-2">
        <span>🏠 Home</span>
        <span>›</span>
        <span>Spesa online</span>
        <span>›</span>
        <span>Vino, birra e alcolici</span>
        <span>›</span>
        <span>Vino</span>
        <span>›</span>
        <span>Bollicine</span>
        <span>›</span>
        <span className="text-gray-900">Spumante</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="flex justify-center items-start">
          {product.mainImage ? (
            <img
              src={product.mainImage}
              alt={product.nome}
              className="max-w-md w-full h-auto object-contain"
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="20" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-full max-w-md h-96 bg-gray-100 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-400 text-sm">Immagine non disponibile</p>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-normal text-gray-900 mb-2">{product.nome || 'Nome prodotto'}</h1>
          <h2 className="text-xl text-gray-500 mb-4">{product.brand || 'Brand'}</h2>

          <div className="inline-block px-4 py-1 border-2 border-green-600 text-green-600 text-sm font-semibold mb-6 rounded">
            DISPONIBILE
          </div>

          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-600">{product.prezzoPer || '50,53 €/lt'}</p>
                <p className="text-xs text-gray-500">{product.volume}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-500">{product.prezzo || '37,90'} €</p>
              </div>
            </div>

            <button
              type="button"
              className="w-full mt-4 py-3 px-6 border-2 border-orange-500 text-orange-500 font-semibold rounded-full hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              AGGIUNGI
            </button>
          </div>
        </div>
      </div>

      <div className="border-b-2 border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
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

      <div className="min-h-[300px]">
        {activeTab === 'prodotto' && (
          <div className="prose max-w-none">
            {product.descrizione ? (
              <div dangerouslySetInnerHTML={{ __html: product.descrizione.replace(/\n/g, '<br>') }} />
            ) : (
              <p className="text-gray-500 italic">Descrizione non disponibile</p>
            )}
          </div>
        )}

        {activeTab === 'fornito' && (
          <div className="prose max-w-none">
            {product.fornitoDa ? (
              <div dangerouslySetInnerHTML={{ __html: product.fornitoDa.replace(/\n/g, '<br>') }} />
            ) : (
              <p className="text-gray-500 italic">Informazioni sul fornitore non disponibili</p>
            )}
          </div>
        )}

        {activeTab === 'etichetta' && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900">{product.nome}</h3>

            {product.inci && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">INCI</h4>
                <p className="text-gray-600">{product.inci}</p>
              </div>
            )}

            {product.ingredienti && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Ingredienti</h4>
                <p className="text-gray-600">{product.ingredienti}</p>
              </div>
            )}

            {product.nutritionalImages && product.nutritionalImages.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Etichette nutrizionali</h4>
                <div className="grid grid-cols-2 gap-4">
                  {product.nutritionalImages.map((img, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                      <img
                        src={img}
                        alt={`Etichetta ${idx + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.parentElement.innerHTML =
                            '<div class="p-8 text-center text-gray-400">Immagine non disponibile</div>';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.disclaimer && (
              <div className="bg-gray-50 border-l-4 border-orange-500 p-4 rounded">
                <p className="text-xs text-gray-600 leading-relaxed">{product.disclaimer}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dettagli' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-semibold text-gray-700 w-1/3">SKU</td>
                  <td className="py-4 px-6 text-gray-900">{product.sku}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-semibold text-gray-700">Fornito da</td>
                  <td className="py-4 px-6 text-gray-900">{product.brand || '-'}</td>
                </tr>
                {product.paese && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Paese del produttore</td>
                    <td className="py-4 px-6 text-gray-900">{product.paese}</td>
                  </tr>
                )}
                {product.regione && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Regione del produttore</td>
                    <td className="py-4 px-6 text-gray-900">{product.regione}</td>
                  </tr>
                )}
                {product.gradazione && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Gradazione alcolica</td>
                    <td className="py-4 px-6 text-gray-900">{product.gradazione}</td>
                  </tr>
                )}
                {product.prezzoPer && (
                  <tr className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold text-gray-700">Prezzo per unità di misura</td>
                    <td className="py-4 px-6 text-gray-900">{product.prezzoPer}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
