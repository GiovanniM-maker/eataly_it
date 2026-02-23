const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const stream = require('stream');
require('dotenv').config();

const APP_PASSWORD_ADMIN = process.env.APP_PASSWORD_ADMIN;
const APP_PASSWORD_LIMITED = process.env.APP_PASSWORD_LIMITED;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const hasAuth = !!(APP_PASSWORD_ADMIN || APP_PASSWORD_LIMITED);

const authenticateToken = (req, res, next) => {
  if (!hasAuth) return next();
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token mancante' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token non valido' });
    req.user = decoded;
    next();
  });
};

const protectApi = (req, res, next) => {
  if (!hasAuth) return next();
  if (req.path === '/health' || req.path.startsWith('/auth/')) return next();
  authenticateToken(req, res, next);
};

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo PNG e JPG sono permessi'));
    }
  }
});

app.use(cors());
app.use(express.json());

// Auth middleware: proteggi tutte le route /api tranne health e auth
app.use('/api', protectApi);

// --- Auth routes (pubbliche) ---
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!hasAuth) return res.status(500).json({ error: 'Auth non configurata' });
  let role = null;
  if (password === APP_PASSWORD_ADMIN) role = 'admin';
  else if (password === APP_PASSWORD_LIMITED) role = 'limited';
  if (!role) return res.status(401).json({ error: 'Password errata' });
  const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role });
});

app.get('/api/auth/check', (req, res) => {
  if (!hasAuth) return res.json({ protected: false });
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.json({ protected: true, valid: false });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.json({ protected: true, valid: false });
    res.json({ protected: true, valid: true, role: decoded.role });
  });
});

// --- Activity log & stats (in-memory) ---
let activityLog = [];
let recentFiles = [];
const stats = { uploadsToday: 0, triggersToday: 0, lastResetDate: null };
let workflowStatus = {};

const addActivity = (type, message, metadata = {}) => {
  activityLog.unshift({
    id: Date.now(),
    type,
    message,
    metadata,
    timestamp: new Date().toISOString()
  });
  if (activityLog.length > 100) activityLog = activityLog.slice(0, 100);
};

const checkAndResetStats = () => {
  const today = new Date().toDateString();
  if (stats.lastResetDate !== today) {
    stats.uploadsToday = 0;
    stats.triggersToday = 0;
    stats.lastResetDate = today;
  }
};

// Verifica che sia il backend giusto
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'N8N Drive Backend' }));

// Activity feed (ultimi 20)
app.get('/api/activity', (req, res) => {
  res.json({ activities: activityLog.slice(0, 20) });
});

// Stats (per sidebar)
app.get('/api/stats', (req, res) => {
  checkAndResetStats();
  res.json(stats);
});

app.post('/api/trigger-stat', (req, res) => {
  checkAndResetStats();
  stats.triggersToday++;
  addActivity('trigger', 'Workflow N8N avviato');
  res.json({ success: true });
});

// Recent files
app.get('/api/recent-files', (req, res) => {
  res.json({ files: recentFiles.slice(0, 10) });
});

// Workflow status (N8N può POST qui da cloud se backend è raggiungibile)
app.post('/api/workflow-status', (req, res) => {
  const { workflowId, status, step } = req.body;
  if (workflowId) {
    workflowStatus[workflowId] = { status, step, timestamp: Date.now() };
  }
  const oneHourAgo = Date.now() - 3600000;
  Object.keys(workflowStatus).forEach(id => {
    if (workflowStatus[id].timestamp < oneHourAgo) delete workflowStatus[id];
  });
  res.json({ success: true });
});

app.get('/api/workflow-status/:id', (req, res) => {
  const status = workflowStatus[req.params.id];
  if (!status) return res.json({ status: 'unknown' });
  const elapsed = Math.floor((Date.now() - status.timestamp) / 1000);
  res.json({ ...status, elapsed });
});

// Google Auth: Service Account per Drive (upload) + Sheets (lettura). Nessuna autorizzazione utente.
// Per Drive: la cartella GOOGLE_DRIVE_FOLDER_ID deve essere in un Shared Drive con il service account come membro.
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
});
const drive = google.drive({ version: 'v3', auth });
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Proxy per generazione N8N
app.post('/api/generate', async (req, res) => {
  if (!N8N_WEBHOOK_URL) {
    return res.status(500).json({ error: 'N8N_WEBHOOK_URL non configurato' });
  }
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(response.ok ? data : { error: data.message || 'Errore N8N' });
  } catch (error) {
    console.error('N8N webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload endpoint (Service Account → cartella in Shared Drive, autorizzazione di base)
app.post('/api/upload', upload.array('images', 20), async (req, res) => {
  try {
    checkAndResetStats();
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nessuna immagine caricata' });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return res.status(500).json({ error: 'GOOGLE_DRIVE_FOLDER_ID non configurato' });
    }

    const uploadPromises = req.files.map(async (file) => {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      const response = await drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
      });
      return { name: file.originalname, id: response.data.id, size: file.size, success: true };
    });

    const results = await Promise.allSettled(uploadPromises);
    const uploads = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { name: req.files[idx].originalname, success: false, error: result.reason.message };
      }
    });

    const successCount = uploads.filter(u => u.success).length;
    stats.uploadsToday++;
    addActivity('upload', `${successCount} file caricati`, {
      count: successCount,
      files: uploads.filter(u => u.success).map(u => u.name)
    });
    req.files.forEach(f => {
      recentFiles.unshift({ name: f.originalname, at: new Date().toISOString(), size: f.size });
    });
    if (recentFiles.length > 50) recentFiles = recentFiles.slice(0, 50);

    res.json({ uploads });
  } catch (error) {
    console.error('Upload error:', error);
    addActivity('upload', 'Errore upload', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Nome tab del foglio (es. "Output" o "Sheet1") — in .env: GOOGLE_SHEET_TAB=Output
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || 'Output';

// Sheet preview (prime righe)
app.get('/api/sheet-preview', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID non configurato' });
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `'${SHEET_TAB}'!A1:BA10`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    res.json({ values: response.data.values || [] });
  } catch (error) {
    console.error('Sheet preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sheet data LIVE (colonne A–BA, fino a 500 righe per evitare timeout/limiti)
app.get('/api/sheet-data', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID non configurato' });
    }
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `'${SHEET_TAB}'!A1:BA500`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const values = response.data.values || [];
    return res.json({
      values,
      lastUpdate: new Date().toISOString(),
      rowCount: values.length
    });
  } catch (error) {
    const message = error?.message || error?.errors?.[0]?.message || 'Errore lettura foglio';
    console.error('Sheet data error:', message, error);
    return res.status(500).json({ error: message });
  }
});

// Storage quota Drive (Service Account; su Shared Drive può non essere disponibile)
app.get('/api/storage-quota', async (req, res) => {
  try {
    const about = await drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;
    if (!quota.limit) return res.json({ used: '0', limit: '0', percentage: '0' });
    const used = parseInt(quota.usage || 0, 10) / (1024 ** 3);
    const limit = parseInt(quota.limit, 10) / (1024 ** 3);
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    res.json({
      used: used.toFixed(2),
      limit: limit.toFixed(2),
      percentage: percentage.toFixed(1),
    });
  } catch (error) {
    console.error('Storage quota error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PREVIEW ENDPOINTS
// ==========================================

// GET lista prodotti (SKU + Nome)
app.get('/api/products/list', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID non configurato' });
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `'${SHEET_TAB}'!A1:BA1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const rows = response.data.values || [];
    if (rows.length === 0) return res.json({ products: [] });
    const headers = rows[0];
    const skuIndex = headers.findIndex((h) => h && h.toString().toLowerCase().includes('sku'));
    const nomeIndex = headers.findIndex((h) => h && (h.toString().toLowerCase().includes('nome') || h.toString().toLowerCase().includes('prodotto')));
    if (skuIndex === -1) return res.status(400).json({ error: 'Colonna SKU non trovata nel foglio' });
    const products = rows
      .slice(1)
      .filter((row) => row[skuIndex])
      .map((row) => ({
        sku: row[skuIndex],
        nome: row[nomeIndex] || 'Prodotto senza nome',
      }));
    res.json({ products });
  } catch (error) {
    console.error('Error fetching product list:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET dettaglio prodotto per SKU
app.get('/api/product/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID non configurato' });
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `'${SHEET_TAB}'!A1:BA1000`;
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const rows = sheetData.data.values || [];
    if (rows.length === 0) return res.status(404).json({ error: 'Foglio vuoto' });
    const headers = rows[0];
    const skuIndex = headers.findIndex((h) => h && h.toString().toLowerCase().includes('sku'));
    if (skuIndex === -1) return res.status(400).json({ error: 'Colonna SKU non trovata' });
    const productRow = rows.find((row) => row[skuIndex] === sku);
    if (!productRow) return res.status(404).json({ error: `Prodotto con SKU ${sku} non trovato` });
    const getColumn = (columnName) => {
      const index = headers.findIndex((h) => h && h.toString().toLowerCase().includes(columnName.toLowerCase()));
      return index !== -1 ? productRow[index] : null;
    };
    // Funzione per match esatto (case-insensitive, trim)
    const getColumnExact = (columnName) => {
      const index = headers.findIndex((h) => {
        if (!h) return false;
        const headerTrimmed = h.toString().trim().toLowerCase();
        const searchTrimmed = columnName.trim().toLowerCase();
        return headerTrimmed === searchTrimmed;
      });
      return index !== -1 ? productRow[index] : null;
    };
    // Brand: SOLO colonna "Brand" (esatto). Escludi "Fornito Da_EXT" che può essere scambiata.
    const brandIndex = headers.findIndex((h) => {
      if (!h) return false;
      const hLower = h.toString().trim().toLowerCase();
      return hLower === 'brand';
    });
    const fornitoDaExtIndex = headers.findIndex((h) => {
      if (!h) return false;
      const hLower = h.toString().trim().toLowerCase();
      return hLower === 'fornito da_ext';
    });
    const product = {
      sku: sku,
      nome: getColumn('Nome Prodotto') || getColumn('Nome'),
      brand: brandIndex >= 0 ? (productRow[brandIndex] || null) : null,
      descrizione: getColumn('Descrizione'),
      shortDescription: getColumn('SHORT DESCRIPTION') || getColumn('Short Description') || getColumn('Short description'),
      fornitoDa: fornitoDaExtIndex >= 0 ? (productRow[fornitoDaExtIndex] || null) : null,
      disclaimer: getColumn('DISCLAIMER') || getColumn('Disclaimer'),
      inci: getColumn('Inci') || getColumn('INCI'),
      ingredienti: getColumn('Ingredienti'),
      paese: getColumn('Paese Produttore') || getColumn('Paese'),
      regione: getColumn('Regione Produttore') || getColumn('Regione'),
      gradazione: getColumn('Gradazione Alcolica') || getColumn('Gradazione'),
      prezzo: getColumn('Prezzo'),
      prezzoPer: getColumn('Prezzo per unità di misura') || getColumn('Prezzo per'),
      volume: getColumn('Volume') || '0,75l',
    };
    
    // Log per debug brand e fornitoDa
    console.log(`🔍 DEBUG - SKU: ${sku}`);
    console.log(`   Headers: ${JSON.stringify(headers)}`);
    console.log(`   brandIndex: ${brandIndex}, fornitoDaExtIndex: ${fornitoDaExtIndex}`);
    console.log(`   Brand: ${product.brand}`);
    console.log(`   Fornito Da_EXT: ${product.fornitoDa}`);
    
    // 4. CERCA IMMAGINI SU GOOGLE DRIVE (IN TUTTO IL DRIVE, NON SOLO UNA CARTELLA)
    const drive = google.drive({ version: 'v3', auth });

    // Helper per ottenere URL immagine accessibile
    // Usa proxy backend per bypassare problemi CORS e permessi
    const getImageUrl = (file) => {
      if (!file || !file.id) return null;
      
      // Usa sempre il proxy backend per evitare problemi CORS e permessi
      // Costruisci URL completo se disponibile, altrimenti usa relativo
      const backendUrl = process.env.BACKEND_URL || process.env.VITE_API_URL || '';
      if (backendUrl) {
        return `${backendUrl}/api/drive-image/${file.id}`;
      }
      // URL relativo: Vite proxy lo reindirizzerà al backend
      return `/api/drive-image/${file.id}`;
    };

    try {
      console.log(`🔍 Cerco immagini per SKU: ${sku} in TUTTO il Drive`);
      
      // Cerca in TUTTO il Drive (senza limitazione di cartella)
      const searchResponse = await drive.files.list({
        q: `name contains '${sku}' and (mimeType='image/png' or mimeType='image/jpeg')`,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, parents)',
        pageSize: 100,
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      
      const files = searchResponse.data.files || [];
      console.log(`📸 Trovati ${files.length} file immagine per SKU ${sku} in tutto il Drive`);
      
      if (files.length > 0) {
        console.log('📋 File trovati:');
        files.forEach((f, idx) => {
          console.log(`   ${idx + 1}. ${f.name} (cartella: ${f.parents?.[0] || 'N/A'})`);
        });
      } else {
        console.log('⚠️ Nessun file trovato con questo SKU');
      }
      
      // Separa immagine principale da nutritional
      let mainImageFile = null;
      const nutritionalFiles = [];
      
      files.forEach(file => {
        const nameLower = file.name.toLowerCase();
        
        // Priorità: file con "image" nel nome (ma non "nutritional")
        if (nameLower.includes('image') && !nameLower.includes('nutritional')) {
          if (!mainImageFile) {
            mainImageFile = file;
          }
        }
        // File con "nutritional" nel nome
        else if (nameLower.includes('nutritional')) {
          nutritionalFiles.push(file);
        }
      });
      
      // Se non abbiamo trovato file con "image", prendi il primo disponibile (che non sia nutritional)
      if (!mainImageFile && files.length > 0) {
        const nonNutritional = files.filter(f => !f.name.toLowerCase().includes('nutritional'));
        if (nonNutritional.length > 0) {
          mainImageFile = nonNutritional[0];
          console.log(`⚠️ Nessun file "_image" trovato, uso: ${mainImageFile.name}`);
        }
      }
      
      // Converti in URL
      product.mainImage = getImageUrl(mainImageFile);
      product.mainImageFileName = mainImageFile?.name || null;
      
      // Converti immagini nutrizionali in oggetti con URL e nome file
      product.nutritionalImages = nutritionalFiles
        .map(f => {
          const url = getImageUrl(f);
          return url ? { url, fileName: f.name } : null;
        })
        .filter(Boolean);
      
      // Rimuovi duplicati basandosi su URL + fileName
      const seen = new Set();
      product.nutritionalImages = product.nutritionalImages.filter(img => {
        const key = `${img.url}|${img.fileName}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      
      console.log(`✅ Immagine principale: ${product.mainImage ? 'TROVATA' : 'NON TROVATA'}`);
      if (product.mainImage) {
        console.log(`   File: ${mainImageFile.name}`);
        console.log(`   URL: ${product.mainImage}`);
      }
      console.log(`✅ Etichette nutrizionali: ${product.nutritionalImages.length} trovate`);
      product.nutritionalImages.forEach((img, idx) => {
        console.log(`   ${idx + 1}. File: ${img.fileName}, URL: ${img.url}`);
      });
      
    } catch (imgError) {
      console.error('❌ Errore ricerca immagini:', imgError.message);
      product.mainImage = null;
      product.mainImageFileName = null;
      product.nutritionalImages = [];
    }

    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint per servire immagini Google Drive (bypass CORS e permessi)
app.get('/api/drive-image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const drive = google.drive({ version: 'v3', auth });
    
    // Scarica il file da Google Drive
    const fileResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    // Imposta header corretti per le immagini
    res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Stream del file al client
    fileResponse.data.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error.message);
    res.status(404).json({ error: 'Image not found' });
  }
});

// --- Comments System (MVP) ---
let commentsCache = {};
let inFlightReadPromise = null;

// Helper per verificare se cache è valida (TTL 30s)
const isCacheValid = (key) => {
  if (!commentsCache[key]) return false;
  return Date.now() - commentsCache[key].timestamp < 30000;
};

// Helper per invalidare cache
const invalidateCache = (productId) => {
  delete commentsCache[productId];
  // Invalida anche tutte le cache per sezioni di questo prodotto
  Object.keys(commentsCache).forEach(key => {
    if (key.startsWith(`${productId}|`)) {
      delete commentsCache[key];
    }
  });
};

// Helper per leggere tab Comments da Google Sheet (con lock per chiamate parallele)
const readCommentsSheet = async () => {
  // Se c'è già una lettura in corso, riusa quella promise
  if (inFlightReadPromise) {
    console.log('📊 [COMMENTS] Riuso promise esistente per lettura sheet');
    return inFlightReadPromise;
  }
  
  // Crea nuova promise
  inFlightReadPromise = (async () => {
    try {
      const sheetId = process.env.GOOGLE_SHEET_ID;
      if (!sheetId) {
        throw new Error('GOOGLE_SHEET_ID non configurato');
      }
      
      console.log(`📊 [COMMENTS] Leggo tab Comments da sheet ${sheetId}`);
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Legge tab Comments (GID: 236132552) - range A1:G10000
      // Colonne: id, product_id, section, current_text, comment, page_url, time_stamp
      const range = 'Comments!A1:G10000';
      console.log(`📊 [COMMENTS] Range richiesto: ${range}`);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      
      const rows = response.data.values || [];
      console.log(`📊 [COMMENTS] Righe lette dal sheet: ${rows.length}`);
      
      if (rows.length === 0) {
        console.log('⚠️ [COMMENTS] Nessuna riga trovata nel sheet');
        return [];
      }
      
      const headers = rows[0]; // id, product_id, section, current_text, comment, page_url, time_stamp
      console.log(`📊 [COMMENTS] Headers trovati:`, headers);
      const comments = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) {
          console.log(`⚠️ [COMMENTS] Riga ${i} saltata (id vuoto)`);
          continue; // Skip righe vuote
        }
        
        const comment = {
          id: String(row[0] || '').trim(),
          product_id: String(row[1] || '').trim(),
          section: String(row[2] || '').trim(),
          current_text: String(row[3] || '').trim(),
          comment: String(row[4] || '').trim(),
          page_url: String(row[5] || '').trim(),
          time_stamp: String(row[6] || '').trim(),
        };
        
        comments.push(comment);
      }
      
      console.log(`✅ [COMMENTS] Commenti parsati: ${comments.length}`);
      if (comments.length > 0) {
        console.log(`📊 [COMMENTS] Primo commento esempio:`, {
          id: comments[0].id,
          product_id: comments[0].product_id,
          section: comments[0].section
        });
      }
      
      return comments;
    } catch (error) {
      console.error('❌ [COMMENTS] Error reading Comments sheet:', error.message);
      console.error('   Stack:', error.stack);
      throw error;
    } finally {
      // Reset lock dopo completamento
      inFlightReadPromise = null;
    }
  })();
  
  return inFlightReadPromise;
};

// GET summary commenti per prodotto (count per sezione)
app.get('/api/comments/summary/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(`📊 [COMMENTS] Richiesta summary per prodotto: ${productId}`);
    const cacheKey = productId;
    
    // Check cache
    if (isCacheValid(cacheKey)) {
      console.log(`📊 [COMMENTS] Cache hit per summary ${productId}`);
      return res.json(commentsCache[cacheKey].data);
    }
    
    console.log(`📊 [COMMENTS] Leggo summary commenti per prodotto ${productId}`);
    
    // Leggi sheet
    const allComments = await readCommentsSheet();
    console.log(`📊 [COMMENTS] Totale commenti letti dal sheet: ${allComments.length}`);
    
    // Filtra per product_id (conversione a stringa per sicurezza)
    const productComments = allComments.filter(c => {
      const cId = String(c.product_id || '').trim();
      const pId = String(productId || '').trim();
      return cId === pId;
    });
    console.log(`📊 [COMMENTS] Commenti filtrati per ${productId}: ${productComments.length}`);
    
    // Aggrega count per section
    const counts = {};
    productComments.forEach(c => {
      if (c.section) {
        counts[c.section] = (counts[c.section] || 0) + 1;
      }
    });
    
    const result = {
      product_id: productId,
      counts
    };
    
    // Salva in cache
    commentsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };
    
    console.log(`✅ [COMMENTS] Summary ${productId}:`, JSON.stringify(counts));
    res.json(result);
  } catch (error) {
    console.error('❌ [COMMENTS] Error fetching comments summary:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// GET lista commenti per sezione specifica
app.get('/api/comments/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { section } = req.query;
    
    if (!section) {
      return res.status(400).json({ error: 'section query parameter required' });
    }
    
    const cacheKey = `${productId}|${section}`;
    
    // Check cache
    if (isCacheValid(cacheKey)) {
      console.log(`📝 Cache hit per commenti ${productId}|${section}`);
      return res.json(commentsCache[cacheKey].data);
    }
    
    console.log(`📝 Leggo commenti per ${productId}|${section}`);
    
    // Leggi sheet
    const allComments = await readCommentsSheet();
    
    // Filtra per product_id e section
    let filtered = allComments.filter(c => 
      c.product_id === productId && c.section === section
    );
    
    // Ordina per time_stamp DESC (più recenti prima)
    filtered.sort((a, b) => {
      const dateA = Date.parse(a.time_stamp) || 0;
      const dateB = Date.parse(b.time_stamp) || 0;
      return dateB - dateA; // DESC
    });
    
    // Formatta response
    const items = filtered.map(c => ({
      id: c.id,
      time_stamp: c.time_stamp,
      comment: c.comment,
      current_text: c.current_text
    }));
    
    const result = {
      product_id: productId,
      section,
      items
    };
    
    // Salva in cache
    commentsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };
    
    console.log(`✅ Trovati ${items.length} commenti per ${productId}|${section}`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST invalidate cache per prodotto
app.post('/api/comments/invalidate/:productId', (req, res) => {
  const { productId } = req.params;
  invalidateCache(productId);
  console.log(`🔄 Cache invalidata per prodotto ${productId}`);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
