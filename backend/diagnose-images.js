const { google } = require('googleapis');
require('dotenv').config();

// ⚠️ IMPORTANTE: Sostituisci con uno SKU reale che sai che esiste
const TEST_SKU = '638751';
const UPLOAD_FOLDER_ID = '1qXztGcobX2m6zOKB9FjQ9otUDqXdxf1-';

async function diagnose() {
  console.log('🔍 DIAGNOSI COMPLETA GOOGLE DRIVE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
  });

  const drive = google.drive({ version: 'v3', auth });
  
  // TEST 1: Verifica accesso base
  console.log('TEST 1: Verifica accesso Drive\n');
  try {
    const aboutResponse = await drive.about.get({ fields: 'user' });
    console.log(`✅ Service account connesso: ${aboutResponse.data.user?.emailAddress}\n`);
  } catch (err) {
    console.error('❌ ERRORE ACCESSO DRIVE:', err.message);
    console.error('   → Il service account potrebbe non avere permessi\n');
    return;
  }
  
  // TEST 2: Verifica accesso cartella specifica
  console.log('TEST 2: Verifica accesso cartella uploads\n');
  console.log(`Cartella ID: ${UPLOAD_FOLDER_ID}\n`);
  try {
    const folderInfo = await drive.files.get({
      fileId: UPLOAD_FOLDER_ID,
      fields: 'id, name, mimeType, owners, permissions',
      supportsAllDrives: true,
    });
    
    console.log(`✅ Cartella trovata: "${folderInfo.data.name}"\n`);
    
    if (folderInfo.data.owners) {
      console.log('👤 Proprietari:');
      folderInfo.data.owners.forEach(o => console.log(`   - ${o.emailAddress}`));
      console.log('');
    }
  } catch (err) {
    console.error('❌ ERRORE ACCESSO CARTELLA:', err.message);
    console.error('   → Il service account NON ha accesso a questa cartella');
    console.error('   → Condividi la cartella con il service account\n');
    return;
  }
  
  // TEST 3: Lista TUTTI i file nella cartella
  console.log('TEST 3: Lista file nella cartella\n');
  try {
    const allFilesResponse = await drive.files.list({
      q: `'${UPLOAD_FOLDER_ID}' in parents`,
      fields: 'files(id, name, mimeType)',
      pageSize: 1000,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const allFiles = allFilesResponse.data.files || [];
    console.log(`📁 Trovati ${allFiles.length} file TOTALI nella cartella\n`);
    
    if (allFiles.length === 0) {
      console.error('❌ CARTELLA VUOTA o service account NON HA ACCESSO');
      console.error('   → Verifica che i file siano nella cartella corretta');
      console.error('   → Verifica permessi del service account\n');
      return;
    }
    
    // Conta per tipo
    const byType = {};
    allFiles.forEach(f => {
      const type = f.mimeType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    console.log('📊 File per tipo:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    console.log('');
    
    // Mostra primi 10 file
    console.log('📋 Primi 10 file (ordinati alfabeticamente):');
    allFiles.slice(0, 10).forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f.name} (${f.mimeType})`);
    });
    console.log('');
    
  } catch (err) {
    console.error('❌ ERRORE LISTA FILE:', err.message);
    return;
  }
  
  // TEST 4: Cerca file per SKU
  console.log(`TEST 4: Cerca file con SKU "${TEST_SKU}"\n`);
  
  try {
    // Query 1: Nella cartella specifica
    console.log('🔧 Query 1: Nella cartella uploads + contains SKU');
    const query1Response = await drive.files.list({
      q: `'${UPLOAD_FOLDER_ID}' in parents and name contains '${TEST_SKU}'`,
      fields: 'files(id, name, mimeType, thumbnailLink, webContentLink)',
      pageSize: 100,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const query1Files = query1Response.data.files || [];
    console.log(`   Risultato: ${query1Files.length} file\n`);
    
    if (query1Files.length > 0) {
      console.log('   ✅ File trovati:');
      query1Files.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.name}`);
        console.log(`      - Type: ${f.mimeType}`);
        console.log(`      - thumbnailLink: ${f.thumbnailLink ? '✅' : '❌'}`);
      });
      console.log('');
    }
    
    // Query 2: Solo immagini
    console.log('🔧 Query 2: Solo immagini + contains SKU');
    const query2Response = await drive.files.list({
      q: `'${UPLOAD_FOLDER_ID}' in parents and name contains '${TEST_SKU}' and (mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg')`,
      fields: 'files(id, name, mimeType, thumbnailLink, webContentLink)',
      pageSize: 100,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const query2Files = query2Response.data.files || [];
    console.log(`   Risultato: ${query2Files.length} file\n`);
    
    if (query2Files.length > 0) {
      console.log('   ✅ IMMAGINI TROVATE!');
      
      const mainImage = query2Files.find(f => f.name.toLowerCase().includes('image') && !f.name.toLowerCase().includes('nutritional'));
      const nutritionalImages = query2Files.filter(f => f.name.toLowerCase().includes('nutritional'));
      
      if (mainImage) {
        console.log(`\n   📷 IMMAGINE PRINCIPALE: ${mainImage.name}`);
        if (mainImage.thumbnailLink) {
          const url = mainImage.thumbnailLink.replace('=s220', '=s800');
          console.log(`      URL: ${url}`);
          console.log(`\n   🧪 TESTA QUESTO URL NEL BROWSER:`);
          console.log(`      ${url}\n`);
        } else {
          console.log(`      ❌ thumbnailLink NON disponibile - file non pubblico`);
        }
        if (mainImage.webContentLink) {
          console.log(`      webContentLink: ${mainImage.webContentLink.replace(/&export=download/, '')}`);
        }
        if (mainImage.id) {
          console.log(`      uc?export=view: https://drive.google.com/uc?export=view&id=${mainImage.id}`);
        }
      }
      
      if (nutritionalImages.length > 0) {
        console.log(`\n   🥗 ETICHETTE NUTRIZIONALI: ${nutritionalImages.length}`);
        nutritionalImages.forEach((f, idx) => {
          console.log(`      ${idx + 1}. ${f.name}`);
        });
      }
      
      console.log('');
    } else {
      console.log('   ❌ Nessuna immagine trovata con questa query\n');
    }
    
  } catch (err) {
    console.error('❌ ERRORE RICERCA:', err.message);
  }
  
  // TEST 5: Cerca in TUTTO il Drive (non solo cartella)
  console.log(`TEST 5: Cerca in TUTTO il Drive (senza filtro cartella)\n`);
  try {
    const globalResponse = await drive.files.list({
      q: `name contains '${TEST_SKU}' and (mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg')`,
      fields: 'files(id, name, mimeType, parents, thumbnailLink, webContentLink)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const globalFiles = globalResponse.data.files || [];
    console.log(`   Risultato: ${globalFiles.length} file in TUTTO il Drive\n`);
    
    if (globalFiles.length > 0) {
      console.log('   File trovati:');
      globalFiles.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.name}`);
        console.log(`      - Cartella parent: ${f.parents?.[0] || 'N/A'}`);
        console.log(`      - thumbnailLink: ${f.thumbnailLink ? '✅' : '❌'}`);
        console.log(`      - webContentLink: ${f.webContentLink ? '✅' : '❌'}`);
      });
      console.log('');
      
      const inCorrectFolder = globalFiles.filter(f => f.parents?.includes(UPLOAD_FOLDER_ID));
      console.log(`   → ${inCorrectFolder.length} di questi sono nella cartella uploads`);
      console.log(`   → ${globalFiles.length - inCorrectFolder.length} sono in altre cartelle\n`);
      
      // Mostra URL di test per il primo file trovato
      if (globalFiles[0]) {
        const firstFile = globalFiles[0];
        console.log(`   🧪 TEST URL per "${firstFile.name}":`);
        if (firstFile.webContentLink) {
          console.log(`      webContentLink: ${firstFile.webContentLink.replace(/&export=download/, '')}`);
        }
        if (firstFile.id) {
          console.log(`      uc?export=view: https://drive.google.com/uc?export=view&id=${firstFile.id}`);
        }
        if (firstFile.thumbnailLink) {
          console.log(`      thumbnailLink: ${firstFile.thumbnailLink.replace('=s220', '=s800')}`);
        }
        console.log('');
      }
    } else {
      console.log('   ❌ Nessun file trovato in tutto il Drive\n');
    }
    
  } catch (err) {
    console.error('❌ ERRORE RICERCA GLOBALE:', err.message);
    console.error('   Stack:', err.stack);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FINE DIAGNOSI\n');
}

diagnose().catch(console.error);
