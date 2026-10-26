---
doc: spec
status: draft
---

# Butterfly.exe — Technical Spec

## How This Works, In Plain Language

The React client asks the Express server for a world definition and supported experiments. The server applies a requested change to a copy of that world's starting state, runs both the original and changed version under the same settings, measures what happened, compares the results, and records the experiment. The client draws the returned states in native WebGL and presents the measured comparison and event evidence. Optional Gemini assistance can suggest or explain experiments, but it cannot supply simulation results. MongoDB is optional; without it, the server labels storage as in-process demo memory.

## The Core Journey Through the System

1. The client loads `GET /api/worlds` and `GET /api/worlds/:world`; Express returns the available world names and selected definition, initial state, rules, modifications, and limits.
2. The user chooses a world and supported modification. For the City example, the request closes a selected road, supplies step horizon and seed, and may supply a starting state.
3. `POST /api/experiments` is validated by the simulation engine. It clones equivalent initial states and runs original and modified scenarios; the same seed is supplied to both.
4. Each world module calculates state trajectories, events, and metrics. The comparison code calculates absolute and safe percentage differences; Surprise Detector flags thresholded changes and ties explanations to measured values and event/state evidence.
5. The repository stores the result in MongoDB when available or process memory in demo mode. The API returns the result and persistence mode.
6. The client updates the selected WebGL scene and comparison panels from that response. Retrieval uses `GET /api/experiments/:id` or `/api/experiments/:id/comparison`; suggestions and explanations use their API routes with actual experiment context.
PRD ref: `prd.md > The Core Journey`.

## Stack

- Browser UI: React 18 and Vite, JavaScript ES modules.
- 3D view: custom native WebGL renderer using procedural geometry; no Three.js/React Three Fiber dependency.
- API: Node.js CommonJS and Express 5.
- Validation, rules, seeded randomness and metric calculations: plain JavaScript server modules; Node's built-in test runner.
- Storage: Mongoose/MongoDB when configured; process-local repository for demo mode.
- Optional AI: `@google/genai` Gemini client, configured only by environment variable.
These are the actual project dependencies; no new framework is required.

## Where It Runs and How Someone Tries It

Run two terminals from the repository root on Windows PowerShell. In the first: `cd server; npm ci; Copy-Item .env.example .env` (edit only needed values), then `npm run dev`. In the second: `cd client; npm ci; npm run dev`; open the local URL printed by Vite. Server defaults to port 4000; the client API service targets the local API unless configured otherwise. `cd server; npm test` runs backend tests, `npm run check` runs syntax checks, and `cd client; npm run build` creates the production build. MongoDB and Gemini are optional for core simulation. For demo video, show the City baseline, close a road, run, compare measurements and inspect evidence; briefly show Ecosystem and Unknown.

## Look and Feel

Near-black, editorial interface with restrained amber accents and distinct world-specific palette and scene composition. Keep the WebGL scene primary, controls compact, and evidence legible. Prefer purposeful transitions, responsive layout and reduced motion; do not depict unsupported mechanics.
PRD ref: `prd.md > Look and Feel`.

## Components

### World definitions and simulation engine

`server/src/simulation/worlds/{city,ecosystem,unknown}.js` define bounded initial state, model rules, supported modifications, limits, trajectories, events and metrics. `server/src/simulation/engine.js` validates requests, runs paired scenarios and constructs comparisons. `server/src/simulation/surpriseDetector.js` evaluates metric changes and evidence. PRD ref: `prd.md > City road-closure experiment`, `prd.md > Ecosystem experiment`, `prd.md > Unknown experiment`, `prd.md > Comparison, evidence, and suggestions`.

### API, AI and persistence

`server/src/routes/simulation.routes.js` and `server/src/controllers/simulation.controller.js` expose world, experiment, comparison, suggestion and explanation resources. `server/src/services/experimentRepository.js` handles MongoDB/demo storage. `server/src/services/simulationAi.service.js` provides deterministic no-key fallbacks and optional validated Gemini suggestions/explanations. PRD ref: `prd.md > States and Boundaries`.

### Client and native WebGL renderer

`client/src/App.jsx` owns world selection, controls, request lifecycle, experiment results and evidence panels. `client/src/services/api.js` calls the API. `client/src/components/WorldScene.jsx` adapts selected world and returned experiment data into the scene interface; `client/src/components/world3d/renderer.js` and `world3d.css` draw and style the native WebGL worlds. PRD ref: `prd.md > Screens and Layout`, `prd.md > Features and Behavior`.

## Data Model

An experiment has a stable ID, world, creation time, steps, seed, modification, cloned initial state, baseline and modified outputs (final state, metrics, trajectories, events), metric comparison, and surprise findings. The repository persists the same record in MongoDB or process memory. In demo mode it exists only for the current server process. World definitions describe supported input limits. The browser uses server-returned definitions/results and local interface state; it does not submit client-computed metrics as authoritative output.

## File Structure

```text
client/src/App.jsx                         shared interface and experiment lifecycle
client/src/services/api.js                 HTTP calls
client/src/components/WorldScene.jsx        world-to-scene adapter
client/src/components/world3d/renderer.js   native WebGL scene implementation
client/src/components/world3d/world3d.css  scene styles
server/src/app.js, server.js                Express application and startup
server/src/routes/simulation.routes.js       REST routes
server/src/controllers/simulation.controller.js request/response handlers
server/src/simulation/engine.js              validation, paired runs and comparison
server/src/simulation/worlds/*.js            three world rules and state
server/src/simulation/surpriseDetector.js     threshold findings and evidence
server/src/services/experimentRepository.js persistence boundary
server/src/services/simulationAi.service.js  optional AI and deterministic fallback
server/tests/simulation.test.js              built-in Node tests
devpost/                                     planning and submission workspace
```

## External Services and Dependencies

- MongoDB is optional (`MONGODB_URI`); Mongoose stores experiment documents. No database means process-local demo storage, not durable storage.
- Gemini is optional (`GEMINI_API_KEY`); the Gen AI SDK is used only for suggestion/explanation features. It receives supported parameters and actual experiment metrics/events; its output is validated and never changes measured output. Provider documentation: https://ai.google.dev/gemini-api/docs
- The browser calls the same-origin/local Express API under `/api`; no external asset service is required.

## API Contract

- `GET /api/health` — engine, AI-configuration and persistence status.
- `GET /api/worlds` — `{ worlds: [{ id, name, description }] }`.
- `GET /api/worlds/:world` — world definition, initial state, rules, modifications and limits.
- `POST /api/experiments` — body: `{ world, steps, modification?, seed?, initialState?, surpriseThreshold? }`; `steps` is required and bounded by the world's limit. Returns `{ experiment, persistence }`. The server computes all result fields.
- `GET /api/experiments/:id` — `{ experiment, persistence }` or JSON 404.
- `GET /api/experiments/:id/comparison` — experiment ID, world, baseline metrics, modified metrics and differences.
- `GET /api/experiments/recent` — recent records and persistence mode.
- `POST /api/suggestions` — `{ world, experimentId? }`; returns validated suggestions, optionally grounded in an existing experiment.
- `POST /api/explanations` — `{ experimentId }`; returns a qualified evidence-grounded explanation.

## Important Failure Modes

- Invalid world, state, modification or horizon → structured 400 validation error; no run is stored.
- MongoDB absent/unavailable → server reports demo mode and uses in-process storage; records are lost on restart.
- Gemini absent or provider failure → core experiment still works with deterministic suggestions and measured-result explanation fallback.
- Unknown experiment/world → structured 404. Client shows errors rather than fabricating result data.

## What Was Simplified and Why

- Native WebGL with procedural geometry instead of an external 3D engine/assets — keeps the current installed client runnable without new dependency access.
- Small bounded models instead of full traffic, ecological or scientific models — results stay inspectable and deterministic where supported.
- Process-local memory instead of mandatory database — keeps local demo usable without MongoDB while reporting durability accurately.
- Optional single-call AI assistance rather than AI inside simulation steps — preserves simulation authority and avoids per-step network dependency.

## Decisions and Open Issues

The implementation and schema above are inferred from the current repository, not a newly approved architecture interview. Native WebGL is the implemented renderer; no claim of Three.js is made. An MIT license file is now present; confirm the copyright attribution is appropriate. Before public release, complete the pending learner review/learning wrap-up and inspect the repository contents and history. This workspace copy has no `.git` directory, so there is no local history or public remote to review.
