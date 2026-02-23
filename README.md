# N8N Drive Uploader

App web full-stack per generazione N8N, upload immagini su Google Drive e apertura del foglio Google.

## Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Google Drive API** con Service Account

## Avvio rapido

### Backend

```bash
cd backend
npm install
# Assicurati che .env e service-account.json siano presenti
npm run dev
```

Il backend sarà disponibile su `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
# Configura .env.local con VITE_N8N_WEBHOOK_URL, VITE_GOOGLE_DOC_URL, VITE_API_URL
npm run dev
```

Apri `http://localhost:5173`.

## Funzionalità

- **Header + Sidebar** – Layout con statistiche, storage Drive, file recenti e attività recenti.
- **Generazione N8N** – Avvio webhook con `workflowId`, polling stato (se N8N invia status al backend), toast e trigger-stat.
- **Upload su Drive** – Validazione file (max 10MB, solo PNG/JPG), anteprime con rimozione singola, progress, link “Apri cartella Drive”, toast.
- **Foglio Google** – Apertura in nuova scheda + preview inline (prime 5 righe da Sheet1).
- **Notifiche** – Toast (react-hot-toast) per successo/errore.
- **Skeleton** – Loader in sidebar per file recenti.

### Stato workflow N8N (real-time)

Se il backend è raggiungibile da N8N (es. deploy o ngrok), nel workflow puoi:

1. Inviare un `workflowId` nel body del webhook (il frontend invia già `wf_<timestamp>`).
2. Dopo ogni step, fare **POST** a `http://<tuo-backend>/api/workflow-status` con body:
   `{ "workflowId": "<id>", "status": "processing"|"completed"|"error", "step": "Descrizione step" }`.
3. Il frontend fa polling su **GET** `/api/workflow-status/:id` e mostra step e tempo.

## Struttura

```
n8n-drive-app/
├── backend/          # Express, upload Drive, .env, service-account
└── frontend/         # React + Vite + Tailwind, componenti
```
