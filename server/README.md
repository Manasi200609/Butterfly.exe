# Butterfly.exe Simulation API

Butterfly.exe is a bounded consequence-discovery sandbox. It runs the same initial state through a baseline and a modified scenario, then compares metrics measured by the simulation engine. It is an illustrative model, not a real-world forecast. Gemini can propose hypotheses and help phrase evidence-based explanations; it cannot set or replace simulation results.

## Architecture and worlds

- `src/simulation/worlds/` holds world definitions, initial states, transition rules and metrics.
- `src/simulation/engine.js` validates requests, clones starting states, runs baseline and intervention, calculates differences and assigns a reproducible ID.
- `src/simulation/surpriseDetector.js` flags threshold-crossing measured changes, links relevant recorded events, and distinguishes observed change, candidate explanation and unverified hypothesis.
- `src/services/experimentRepository.js` persists records with Mongoose or keeps them in process-local demo memory.
- Express routes and controllers expose worlds, experiments, suggestions and explanations. Existing Helmet, CORS, Morgan, JSON-size limit and centralized JSON errors remain.

**The City** routes commuters along shortest travel-time roads before the step loop; it does not dynamically reroute around congestion. Each road has per-step capacity; overflow queues and adds travel time. The default network has 4 intersections, 5 roads and 6 commuters; the horizon is at most 30 steps. Supported interventions: `closeRoad`, `reduceCapacity: { roadId, amount }`, `changeDemand` (-5 through 20), and `delayTransit: { steps }` (0 through 10). Average travel time is measured over completed trips; `congestionEvents` counts every commuter wait in the event log, while each trajectory's `roadQueues` reports the number queued on that step.

**The Ecosystem** regenerates plants up to a carrying capacity, with rainfall scaling regeneration; herbivores consume plants and predators consume herbivores. Population growth depends on food availability and population declines when food is insufficient. The horizon is at most 100 steps. Interventions: `resourceDelta` (-100 through 100), `rainfall` (0 through 2), `regeneration` (0 through 20), and `removeSpecies`. Metrics include plant resource, total population, survival and population balance. This simple model is not scientifically validated.

**The Unknown** exchanges a fraction of resources between neighbors and attempts seeded connection formation between unconnected agents. It measures connected components, cluster sizes, network connectivity, resource inequality, surviving agents and total resources. Interventions: `exchangeRate` (0 through 0.5), `connectionProbability` (0 through 1), `resourceDelta` (-10 through 10), and `removeConnection: [agentA, agentB]`. The horizon is at most 100 steps.

Only The Unknown uses the deterministic 32-bit seeded PRNG for connection formation; City and Ecosystem transitions are deterministic and do not consume the seed. Baseline and modified scenarios use the same seed and equivalent cloned initial conditions. Omitting seed defaults to `1`. Each request is limited to 256 KB; state sizes are bounded by each world.

## API

All endpoints are under `/api`. JSON errors use `{ "error": { "code": "...", "message": "...", "details": [] } }` where applicable.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | API, engine, AI configuration and persistence status; never returns secrets. |
| `GET /api/worlds` | List available worlds. |
| `GET /api/worlds/:world` | World definition, initial state, rules, interventions and limits. |
| `POST /api/experiments` | Run a baseline and modified scenario, compare, detect surprises and save. |
| `GET /api/experiments/:id` | Retrieve a complete experiment. |
| `GET /api/experiments/:id/comparison` | Retrieve baseline metrics, modified metrics and differences. |
| `GET /api/experiments/recent` | Up to 25 most recent experiments. |
| `POST /api/suggestions` | Suggest experiments. Body: `{ "world": "city", "experimentId": "optional-existing-id" }`. |
| `POST /api/explanations` | Explain an existing experiment. Body: `{ "experimentId": "..." }`. |

Create request:

```json
{
  "world": "city",
  "steps": 10,
  "seed": 42,
  "modification": { "closeRoad": "central-work" },
  "surpriseThreshold": 0.15
}
```

`initialState` can optionally replace the selected world's initial state. `surpriseThreshold` is a normalized relative-change threshold from 0.01 to 1. Do not send metrics: all outcomes are calculated by the server. The response has `{ experiment, persistence }`. The experiment includes baseline and modified metrics, final states, trajectories, event records, absolute and percentage differences, findings, seed and parameters. Percent change is `null` when baseline is zero or the values are unavailable.

Surprise scoring is a transparent heuristic: for each numeric metric whose normalized absolute change `abs(modified - baseline) / max(abs(baseline), 1)` reaches the threshold, add `min(1, normalizedChange) * severityWeight`; configured metric weights are in `surpriseDetector.js`. It is not a calibrated scientific measure. Findings label metric changes as observed; event-based explanations are candidates only, and unsupported mechanisms are unverified hypotheses. Event relevance does not establish causality.

PowerShell example:

```powershell
$body = @{ world = 'city'; steps = 10; seed = 42; modification = @{ closeRoad = 'central-work' } } | ConvertTo-Json -Depth 8
$experiment = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/experiments -ContentType 'application/json' -Body $body
$experiment.experiment.id
Invoke-RestMethod -Uri "http://localhost:4000/api/experiments/$($experiment.experiment.id)"
```

## Setup and configuration (Windows PowerShell)

Requires Node.js 20+ and npm. From the project directory:

```powershell
Set-Location .\server
npm install
Copy-Item .env.example .env
npm run dev
```

Run tests with `npm test`, syntax checks with `npm run check`, or run the normal server with `npm start`.

Environment settings: `PORT` (default 4000), `CLIENT_ORIGIN` (comma-separated CORS allowlist), `NODE_ENV`, `GEMINI_API_KEY` (optional), and `MONGODB_URI` (optional). Never commit `.env` or credentials. With no MongoDB URI or unavailable MongoDB, demo mode stores experiments in process memory; the health route reports `persistence: "demo"`, and records disappear when the process exits. MongoDB persistence stores experiment result documents separately from simulation execution.

When Gemini is absent or fails, suggestions use deterministic, world-valid hypotheses and explanations return measured metrics plus event evidence. When configured, Gemini sees supported intervention parameters and, for explanations, measured results and event evidence. Suggestions are schema-checked and run through the world validator before acceptance. AI output never changes metrics, trajectories, events, or scores. AI explanations remain qualified hypotheses where simulation evidence does not establish a mechanism.

## Retired BrieflyAI routes and limitations

The prior scholarship API routes `POST/GET /api/assessments`, `POST /api/assessments/:id/reassess`, and `POST /api/documents/upload` are no longer mounted; they return the standard JSON 404. Scholarship-specific code and models remain in the repository but are inactive, preserving history. The current React client uses the Butterfly.exe worlds and experiments API described above.

The simulations are bounded educational abstractions. They do not model full cities, scientifically calibrated ecology, arbitrary user code, or validated forecasts. Seeded stochastic variation currently applies to the Unknown world's connection formation; city and ecosystem transitions are deterministic even when a seed is supplied. No authentication is implemented, so use only for local/demo data and do not treat experiment records as private multi-user data.
