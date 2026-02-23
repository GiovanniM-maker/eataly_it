const { google } = require('googleapis');
require('dotenv').config();

async function diagnoseFolder() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const uploadFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1qXztGcobX2m6zOKB9FjQ9otUDqXdxf1-';
  
  console.log(`🔍 DIAGNOSTICA CARTELLA GOOGLE DRIVE\n`);
  console.log(`📁 Cartella ID: ${uploadFolderId}\n`);
  
  try {
    // Lista TUTTI i file immagine nella cartella
    const response = await drive.files.list({
      q: `'${uploadFolderId}' in parents and (mimeType='image/png' or mimeType='image/jpeg')`,
      fields: 'files(id, name, mimeType)',
      pageSize: 50,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const files = response.data.files || [];
    
    console.log(`📸 Trovati ${files.length} file immagine totali nella cartella\n`);
    
    if (files.length === 0) {
      console.log('❌ NESSUN FILE IMMAGINE TROVATO NELLA CARTELLA!');
      console.log('\nPossibili cause:');
      console.log('  1. La cartella ID è sbagliata');
      console.log('  2. Il service account non ha accesso alla cartella');
      console.log('  3. Non ci sono file immagine nella cartella');
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PRIMI 20 FILE (per capire il pattern):\n');
    
    files.slice(0, 20).forEach((file, idx) => {
      console.log(`${idx + 1}. ${file.name}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔍 ANALISI PATTERN:\n');
    
    // Estrai SKU dai nomi file
    const skuPatterns = new Set();
    files.forEach(file => {
      // Prova pattern: numero all'inizio o nel nome
      const match = file.name.match(/(\d+)/);
      if (match) {
        skuPatterns.add(match[1]);
      }
    });
    
    console.log(`📊 SKU trovati nei nomi file: ${skuPatterns.size} diversi`);
    console.log(`   Esempi: ${Array.from(skuPatterns).slice(0, 10).join(', ')}`);
    
    // Cerca file che contengono "532638"
    const testSku = '532638';
    const matchingFiles = files.filter(f => f.name.includes(testSku));
    
    console.log(`\n🔎 File che contengono "${testSku}": ${matchingFiles.length}`);
    if (matchingFiles.length > 0) {
      matchingFiles.forEach(f => console.log(`   - ${f.name}`));
    } else {
      console.log(`   ❌ Nessun file trovato con "${testSku}" nel nome`);
      console.log(`\n💡 SUGGERIMENTI:`);
      console.log(`   1. Verifica che lo SKU nel Google Sheet corrisponda ai nomi dei file`);
      console.log(`   2. Controlla se i file hanno un formato diverso (es: "SKU-532638" invece di "532638")`);
      console.log(`   3. Verifica che i file siano nella cartella corretta`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERRORE:', error.message);
    console.error(error.stack);
  }
}

diagnoseFolder().catch(console.error);
