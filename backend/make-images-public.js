const { google } = require('googleapis');
require('dotenv').config();

async function makeImagesPublic() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const uploadFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1qXztGcobX2m6zOKB9FjQ9otUDqXdxf1-';
  
  console.log('🔓 Rendo pubblici tutti i file immagine nella cartella uploads...\n');
  
  try {
    const response = await drive.files.list({
      q: `'${uploadFolderId}' in parents and (mimeType='image/png' or mimeType='image/jpeg')`,
      fields: 'files(id, name)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const files = response.data.files || [];
    console.log(`📁 Trovati ${files.length} file immagine\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      try {
        // Controlla se già pubblico
        const permissionsCheck = await drive.permissions.list({
          fileId: file.id,
          fields: 'permissions(type, role)',
          supportsAllDrives: true,
        });
        
        const isPublic = permissionsCheck.data.permissions?.some(
          p => p.type === 'anyone' && p.role === 'reader'
        );
        
        if (isPublic) {
          console.log(`⏭️  ${file.name} (già pubblico)`);
          successCount++;
          continue;
        }
        
        // Rendi pubblico
        await drive.permissions.create({
          fileId: file.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true,
        });
        
        console.log(`✅ ${file.name}`);
        successCount++;
        
      } catch (err) {
        console.error(`❌ ${file.name}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successo: ${successCount}/${files.length}`);
    console.log(`❌ Errori: ${errorCount}/${files.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
  } catch (error) {
    console.error('❌ ERRORE GENERALE:', error.message);
  }
}

makeImagesPublic().catch(console.error);
