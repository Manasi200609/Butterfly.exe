# Butterfly.exe Client

The React and Vite client for the Butterfly.exe consequence sandbox. The interface reads world definitions and initial states from the backend, submits bounded experiment inputs, and renders only metrics, events, and findings returned by the simulation API.

## Run locally (Windows PowerShell)

Start the backend in one terminal:

```powershell
Set-Location ..\server
npm install
npm run dev
```

In another terminal, start the client:

```powershell
Set-Location ..\client
npm install
Copy-Item .env.example .env.local
npm run dev
```

Vite reads `VITE_API_BASE_URL` from `.env.local`. It defaults in code to `http://localhost:4000`; the example file sets that same local API address. Change it to the backend origin when running elsewhere. Do not put secrets in Vite variables because they are included in client-side builds.

Create a production build with `npm run build`. The client currently has no separate automated test script; its production build is the available frontend validation command.

The backend must expose `/api/worlds`, `/api/experiments`, `/api/suggestions`, and `/api/explanations`. The prior scholarship assessment and upload endpoints are no longer used by this client.
