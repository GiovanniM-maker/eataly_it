const { google } = require('googleapis');
require('dotenv').config();

// ⚠️ IMPORTANTE: Sostituisci con un SKU reale che ha immagini
const TEST_SKU = '638751';  // ← USA QUESTO O UN ALTRO SKU REALE

async function testImages() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });
    
  console.log(`🔍 TEST IMMAGINI PER SKU: ${TEST_SKU}\n`);
  console.log(`📁 Cercando in TUTTO il Drive\n`);
  
  try {
    const response = await drive.files.list({
      q: `name contains '${TEST_SKU}' and (mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg')`,
      fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)',
      pageSize: 200,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const files = response.data.files || [];
    
    console.log(`📸 Trovati ${files.length} file\n`);
    
    if (files.length === 0) {
      console.log('❌ NESSUN FILE TROVATO!');
      console.log('\nPossibili cause:');
      console.log('  1. Lo SKU non corrisponde ai nomi dei file');
      console.log('  2. I file non sono nella cartella corretta');
      console.log('  3. Il service account non ha accesso');
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    files.forEach((file, idx) => {
      console.log(`${idx + 1}. ${file.name}`);
      console.log(`   📋 ID: ${file.id}`);
      console.log(`   📦 Type: ${file.mimeType}`);
      
      const nameLower = file.name.toLowerCase();
      if (nameLower.includes('image') && !nameLower.includes('nutritional')) {
        console.log(`   🎯 TIPO: Immagine principale`);
      } else if (nameLower.includes('nutritional')) {
        console.log(`   🥗 TIPO: Etichetta nutrizionale`);
      } else {
        console.log(`   ❓ TIPO: Non identificato`);
      }
      
      console.log(`   ✅ thumbnailLink: ${file.thumbnailLink ? file.thumbnailLink.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`   ✅ webContentLink: ${file.webContentLink || 'N/A'}`);
      console.log(`   ✅ uc?export=view: https://drive.google.com/uc?export=view&id=${file.id}`);
      
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (files[0]) {
      const file = files[0];
      console.log(`🧪 TEST URL - Copia nel browser:\n`);
      if (file.webContentLink) {
        console.log(`   webContentLink: ${file.webContentLink.replace(/&export=download/, '')}`);
      }
      if (file.id) {
        console.log(`   uc?export=view: https://drive.google.com/uc?export=view&id=${file.id}`);
      }
      if (file.thumbnailLink) {
        console.log(`   thumbnailLink: ${file.thumbnailLink.replace('=s220', '=s800')}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ ERRORE:', error.message);
  }
}

testImages().catch(console.error);
