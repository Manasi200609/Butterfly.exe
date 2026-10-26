# Butterfly.exe

Butterfly.exe is an interactive simulation lab: change one rule, run the world, and inspect measured consequences in three miniature worlds. Its City road-closure workflow compares baseline and modified traffic; Ecosystem and Unknown provide additional bounded, illustrative experiments. The interface renders with custom native WebGL and procedural geometry (not Three.js). Simulation results come from the Node/Express engine; they are not scientific predictions.

## Run locally (Windows PowerShell)

Prerequisites: Node.js 20 or later and npm. MongoDB and Gemini are optional.

Terminal 1 — API:

```powershell
cd .\server
npm ci
Copy-Item .env.example .env
npm run dev
```

Terminal 2 — client:

```powershell
cd .\client
npm ci
npm run dev
```

Open the local address printed by Vite. The API defaults to port 4000. Configure `GEMINI_API_KEY` for optional AI suggestions/explanations and `MONGODB_URI` for durable experiment storage; without them, core simulation runs in demo mode with process-local storage.

## Checks

```powershell
cd .\server
npm test
npm run check
cd ..\client
npm run build
```

See [server/README.md](server/README.md) for the simulation rules, complete API contract, environment options, and limitations. Planning and submission notes are in `devpost/`.

## License

MIT. See [LICENSE](LICENSE).
