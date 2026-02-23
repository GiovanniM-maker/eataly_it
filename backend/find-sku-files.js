const { google } = require('googleapis');
require('dotenv').config();

// ⚠️ IMPORTANTE: Sostituisci con lo SKU che vuoi cercare
const TEST_SKU = '638751';

async function findSkuFiles() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });
    
  console.log(`🔍 RICERCA AVANZATA FILE PER SKU: ${TEST_SKU}\n`);
  console.log(`📁 Cercando in TUTTO il Drive con vari pattern\n`);
  
  // Pattern di ricerca da provare
  const patterns = [
    `name contains '${TEST_SKU}'`,  // Contiene lo SKU
    `name = '${TEST_SKU}_image.png'`,  // Pattern esatto con _image
    `name = '${TEST_SKU}_image.jpg'`,
    `name = '${TEST_SKU}_image.jpeg'`,
    `name = '${TEST_SKU}_0.jpeg'`,  // Pattern numerico
    `name = '${TEST_SKU}_0.jpg'`,
    `name = '${TEST_SKU}_0.png'`,
    `name = '${TEST_SKU}_1.jpeg'`,
    `name = '${TEST_SKU}_1.jpg'`,
    `name = '${TEST_SKU}_1.png'`,
    `name contains '${TEST_SKU}_nutritional'`,  // Etichette nutrizionali
    `name starts with '${TEST_SKU}'`,  // Inizia con lo SKU
  ];
  
  const allFiles = new Map(); // Usa Map per evitare duplicati
  
  for (const pattern of patterns) {
    try {
      const response = await drive.files.list({
        q: `${pattern} and (mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg')`,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, parents)',
        pageSize: 100,
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      
      const files = response.data.files || [];
      
      if (files.length > 0) {
        console.log(`✅ Pattern "${pattern}": ${files.length} file trovati`);
        files.forEach(file => {
          if (!allFiles.has(file.id)) {
            allFiles.set(file.id, file);
          }
        });
      } else {
        console.log(`❌ Pattern "${pattern}": 0 file trovati`);
      }
    } catch (error) {
      console.error(`⚠️ Errore con pattern "${pattern}":`, error.message);
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 RISULTATO TOTALE: ${allFiles.size} file unici trovati\n`);
  
  if (allFiles.size === 0) {
    console.log('❌ NESSUN FILE TROVATO!\n');
    console.log('Possibili cause:');
    console.log('  1. Lo SKU non corrisponde ai nomi dei file');
    console.log('  2. I file hanno un formato diverso (es: "SKU-638751" invece di "638751")');
    console.log('  3. Il service account non ha accesso ai file');
    console.log('  4. I file sono in un formato diverso (non PNG/JPG)');
    console.log('\n💡 Prova a cercare manualmente su Google Drive un file con questo SKU');
    console.log('   e condividi il nome esatto del file.');
    return;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  Array.from(allFiles.values()).forEach((file, idx) => {
    console.log(`${idx + 1}. ${file.name}`);
    console.log(`   📋 ID: ${file.id}`);
    console.log(`   📦 Type: ${file.mimeType}`);
    
    const nameLower = file.name.toLowerCase();
    if (nameLower.includes('image') && !nameLower.includes('nutritional')) {
      console.log(`   🎯 TIPO: Immagine principale`);
    } else if (nameLower.includes('nutritional')) {
      console.log(`   🥗 TIPO: Etichetta nutrizionale`);
    } else if (/^\d+_\d+/.test(file.name)) {
      console.log(`   🎯 TIPO: Probabile immagine principale (pattern numerico)`);
    } else {
      console.log(`   ❓ TIPO: Non identificato`);
    }
    
    console.log(`   ✅ thumbnailLink: ${file.thumbnailLink ? 'Disponibile' : 'N/A'}`);
    console.log(`   ✅ webContentLink: ${file.webContentLink ? 'Disponibile' : 'N/A'}`);
    console.log(`   ✅ webViewLink: ${file.webViewLink ? 'Disponibile' : 'N/A'}`);
    
    if (file.parents && file.parents.length > 0) {
      console.log(`   📁 Parent ID: ${file.parents[0]}`);
    }
    
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Mostra URL di test per il primo file
  const firstFile = Array.from(allFiles.values())[0];
  if (firstFile) {
    console.log(`🧪 TEST URL - Copia nel browser:\n`);
    if (firstFile.webContentLink) {
      console.log(`   webContentLink: ${firstFile.webContentLink.replace(/&export=download/, '')}`);
    }
    if (firstFile.id) {
      console.log(`   uc?export=view: https://drive.google.com/uc?export=view&id=${firstFile.id}`);
    }
    if (firstFile.thumbnailLink) {
      console.log(`   thumbnailLink: ${firstFile.thumbnailLink.replace('=s220', '=s800')}`);
    }
    console.log('');
  }
}

findSkuFiles().catch(console.error);
