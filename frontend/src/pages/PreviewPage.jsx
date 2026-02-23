import { useState, useEffect } from 'react';
import EatalyProductPage from '../components/preview/EatalyProductPage';

export default function PreviewPage() {
  const [selectedSKU, setSelectedSKU] = useState(null);

  useEffect(() => {
    const handleSelect = (e) => {
      setSelectedSKU(e.detail);
    };
    
    window.addEventListener('selectProduct', handleSelect);
    return () => window.removeEventListener('selectProduct', handleSelect);
  }, []);

  return (
    <main className="flex-1 ml-0 lg:ml-[256px] mt-[64px] bg-white min-h-[calc(100vh-64px)]">
      {!selectedSKU ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] px-4 text-center">
          <div className="text-5xl sm:text-6xl mb-4">👈</div>
          <p className="text-lg sm:text-xl text-gray-700 font-medium">Seleziona un prodotto</p>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Apri il menu per vedere la lista prodotti</p>
        </div>
      ) : (
        <EatalyProductPage sku={selectedSKU} />
      )}
    </main>
  );
}
