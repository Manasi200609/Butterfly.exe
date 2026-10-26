---
doc: prd
status: draft
---

# Butterfly.exe — Product Requirements

One line: An interactive simulation lab for curious learners to change one rule and investigate measured consequences in three miniature worlds.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The Core Loop`.

## The Core Journey

1. Open Butterfly.exe and see the purpose in one sentence: “Change one rule. Run the world. Discover the consequences.”
2. Select City, Ecosystem, or Unknown. Each view introduces the system and the kinds of supported changes to try.
3. Inspect the world state, set the simulation horizon and seed, and choose one supported intervention. In the City, select a road and close it.
4. Run the experiment. The server simulates baseline and modified scenarios from equivalent initial state, using the same seed.
5. Explore the modified 3D world and compare measured metrics, state trajectories, and recorded events with baseline.
6. Inspect Surprise Detector findings, evidence references, qualified explanations, and follow-up suggestions; change one rule and run again.
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## Screens and Layout

One shared discovery-lab screen: persistent Butterfly.exe header and world selector, a large interactive 3D scene as the main focus, compact world-specific experiment controls, and result areas for baseline comparison, metrics, events/evidence, findings, and follow-up experiments. Switching worlds changes the scene composition and relevant controls while retaining the shared experiment lifecycle.

## Look and Feel

Near-black, restrained and editorial, with warm amber accents and distinct world-specific colors. The scene is the focus rather than a conventional dashboard. City is a miniature urban road network; Ecosystem is organic and habitat-oriented; Unknown is an abstract connected-agent environment. Motion is purposeful, reduced-motion preferences are respected, and evidence and metrics remain readable.
Source: `scope.md > Inspiration & Identity`.

## Features and Behavior

### World exploration and controls

Users switch among three world views, inspect or focus world elements, navigate the camera, and adjust supported interventions, step horizon, and seed. Scene geometry and overlays represent returned world state and experiment results; decoration is not presented as simulation output.

### City road-closure experiment

City is the core proof of concept. Its bounded model has intersections, road segments with capacities and travel times, and commuters following shortest available routes. A road closure sets the selected road capacity to zero; the simulation routes commuters over remaining available roads and records completions and queue waits. The interface shows the closed segment, resulting traffic state, and returned trip, travel-time, delay, congestion, and event measurements for baseline and modified scenarios. It does not claim dynamic congestion-aware rerouting.

### Ecosystem experiment

Users inspect plants/resources, rabbits, and foxes and apply supported resource, rainfall, regeneration, or species-removal changes. The discrete-step model returns resource and population trajectories, survival, balance metrics, and events. This is an illustrative model, not a scientific forecast.

### Unknown experiment

Users inspect agents and connections and apply supported exchange, connection, resource, or connection-removal changes. Seeded rules drive resource transfers and connection formation. Returned trajectories and metrics describe components, connectivity, inequality, and surviving agents.

### Comparison, evidence, and suggestions

Every run returns its experiment ID, world, simulation parameters, baseline and modified states/metrics/trajectories/events, metric differences, surprise findings, and timestamps. Findings are threshold-based observations, candidate explanations, or unverified hypotheses, with supporting simulation evidence where available. Deterministic suggestions work without Gemini; optional Gemini output cannot alter simulation results and is validated before use.

## States and Boundaries

- **First use/loading** — show available worlds and fetch the selected definition; indicate loading without blocking the rest of the interface on optional recent-experiment or AI requests.
- **Ready** — selected world definition and supported controls are available.
- **Running/success** — show progress and then the returned baseline-versus-modified experiment; the result is reproducible from its recorded parameters and seed.
- **Failure/empty** — show a useful API or validation error and keep the user able to retry or select another world; no fake result is shown.
- **Persistence** — MongoDB stores experiments when configured; otherwise process-local demo memory is reported as demo mode and is lost when the server exits.
- **Interpretation boundary** — findings describe this simplified simulation, not scientific predictions or guaranteed real-world outcomes. An unestablished mechanism stays uncertain.

## Product Decisions

- Prioritize one convincing, complete City road-closure workflow over shallow polish across worlds.
- Include Ecosystem and Unknown because all three are part of the intended discovery experience, while keeping their claims limited to the implemented model.
- Keep simulation results authoritative; AI may assist with suggestions and qualified explanations only.
- Retain the existing dark editorial visual direction and use native WebGL scene rendering currently implemented in the client.

## What We're Building

Three distinct interactive world views; supported per-world interventions; a shared seeded baseline/intervention experiment flow; measured comparisons, trajectories and events; evidence-grounded Surprise Detector findings and follow-up suggestions; retrieval of recent/saved experiments; responsive layout and reduced-motion handling; and clear non-authoritative model limitations.

## Deferred From the POC

Scientifically validated or full-scale models, more worlds and interventions, arbitrary user-defined rules, authentication and multi-user privacy, deployment, external 3D assets, and any AI-generated metrics or simulation events.

## Product Decisions and Open Issues

The client scenes use native WebGL, not Three.js or React Three Fiber. The model is bounded and illustrative. Public deployment, authentication, and scientific calibration are outside this proof of concept.

## Acceptance Criteria

- A first-time user can identify the purpose and select each of the three worlds.
- Closing a City road runs a baseline and modified simulation from equivalent initial conditions and shows the selected road, returned traffic state, measurements, and event evidence.
- Ecosystem and Unknown interventions alter only model-supported state and the views show returned results rather than invented events or statistics.
- The user can inspect comparison and findings, then run another experiment.
- Missing AI/database configuration does not prevent the core demo; mode and errors are stated accurately.
- The interface adapts to narrow screens and reduced-motion settings.

Source: `scope.md > The POC Boundary`, `scope.md > Explicitly Cut`.
