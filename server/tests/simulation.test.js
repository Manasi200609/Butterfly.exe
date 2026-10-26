const test = require("node:test");
const assert = require("node:assert/strict");
const { worlds, runExperiment, validateExperiment, compareMetrics } = require("../src/simulation/engine");
const { detectSurprises } = require("../src/simulation/surpriseDetector");

test("all three worlds expose valid initial states and simulate", () => {
  for (const id of ["city", "ecosystem", "unknown"]) {
    const world = worlds[id];
    assert.equal(world.definition.id, id);
    assert.ok(world.definition.initialState);
    const result = runExperiment({ world: id, steps: 2, seed: 8, modification: {} });
    assert.equal(result.world, id);
  }
});

test("same scenario and seed produce identical actual simulation results", () => {
  const input = { world: "unknown", steps: 8, seed: 123, modification: { connectionProbability: 0.4, exchangeRate: 0.3 } };
  assert.deepEqual(runExperiment(input).modified, runExperiment(input).modified);
});

test("invalid worlds, excessive steps, unsupported fields and invalid interventions are rejected", () => {
  assert.ok(validateExperiment({ world: "ocean", steps: 2 }).length);
  assert.ok(validateExperiment({ world: "city", steps: 31 }).length);
  assert.ok(validateExperiment({ world: "city", steps: 2, magicMetric: 1 }).length);
  assert.ok(validateExperiment({ world: "city", steps: 2, modification: { closeRoad: 5 } }).length);
});

test("baseline and intervention receive equivalent cloned starting states", () => {
  const initialState = structuredClone(worlds.city.definition.initialState);
  const result = runExperiment({ world: "city", steps: 2, seed: 1, initialState, modification: { closeRoad: "central-work" } });
  assert.deepEqual(result.baseline.finalState.roads.map((r) => r.id), result.modified.finalState.roads.map((r) => r.id));
  assert.equal(initialState.roads.find((r) => r.id === "central-work").capacity, 1);
});

test("closing a city road changes measured traffic outcomes and recorded events", () => {
  const result = runExperiment({ world: "city", steps: 10, seed: 9, modification: { closeRoad: "central-work" } });
  assert.notEqual(result.comparison.totalDelay.absoluteDifference, 0);
  assert.ok(result.modified.events.some((event) => event.type === "road_closed" && event.roadId === "central-work"));
});

test("home-central closure can improve throughput by rerouting demand to the higher-capacity corridor", () => {
  const result = runExperiment({ world: "city", steps: 10, seed: 42, modification: { closeRoad: "home-central" } });
  const completedRoutes = (scenario) => new Set(scenario.events.filter((event) => event.type === "trip_completed").map((event) => event.route.join(" > ")));
  assert.deepEqual([...completedRoutes(result.baseline)], ["home-central > central-work"]);
  assert.deepEqual([...completedRoutes(result.modified)], ["home-market > market-work"]);
  assert.equal(result.modified.finalState.roads.find((road) => road.id === "home-central").capacity, 0);
  assert.equal(result.baseline.metrics.demand, result.modified.metrics.demand);
  assert.equal(result.baseline.metrics.demand, 6);
  assert.ok(result.modified.metrics.averageTravelTime < result.baseline.metrics.averageTravelTime);
  assert.ok(result.modified.metrics.congestionEvents < result.baseline.metrics.congestionEvents);
  assert.equal(result.baseline.events.filter((event) => event.type === "queue_wait").length, result.baseline.metrics.congestionEvents);
  assert.equal(result.modified.events.filter((event) => event.type === "queue_wait").length, result.modified.metrics.congestionEvents);
});

test("city road queue trajectories report per-step queues, not cumulative waiting events", () => {
  const result = runExperiment({ world: "city", steps: 10, seed: 42, modification: { closeRoad: "home-central" } });
  for (const scenario of [result.baseline, result.modified]) {
    for (const frame of scenario.trajectories) {
      const queuedByRoad = Object.fromEntries(scenario.finalState.roads.map((road) => [road.id, 0]));
      for (const vehicle of frame.vehicles) if (vehicle.status === "queued" && vehicle.roadId) queuedByRoad[vehicle.roadId]++;
      assert.deepEqual(frame.roadQueues, queuedByRoad);
    }
  }
});

test("city trajectories expose reproducible vehicle states using actual route and queue data", () => {
  const result = runExperiment({ world: "city", steps: 12, seed: 11, modification: { closeRoad: "central-work" } });
  const roadIds = new Set(result.modified.finalState.roads.map((road) => road.id));
  assert.ok(result.modified.trajectories.every((frame) => Array.isArray(frame.vehicles) && frame.vehicles.length === result.modified.metrics.demand));
  assert.ok(result.modified.trajectories.some((frame) => frame.vehicles.some((vehicle) => vehicle.status === "traveling")));
  for (const frame of result.modified.trajectories) {
    for (const vehicle of frame.vehicles) {
      assert.ok(["waiting", "delayed", "traveling", "queued", "no_route", "completed"].includes(vehicle.status));
      assert.ok(vehicle.route.every((roadId) => roadIds.has(roadId)));
      assert.ok(vehicle.roadId === null || roadIds.has(vehicle.roadId));
      assert.ok(vehicle.progress >= 0 && vehicle.progress <= 1);
    }
  }
  const longRoadCompletion = result.modified.events.find((event) => event.type === "trip_completed" && event.route.includes("market-work"));
  assert.ok(longRoadCompletion);
  const longRoadTrip = result.modified.finalState.commuters.find((trip) => trip.id === longRoadCompletion.commuterId);
  assert.ok(longRoadTrip.elapsed >= 3);
});

test("ecosystem resource intervention changes the simulated resource trajectory", () => {
  const result = runExperiment({ world: "ecosystem", steps: 5, seed: 4, modification: { resourceDelta: -25 } });
  assert.notEqual(result.baseline.finalState.resources.plants, result.modified.finalState.resources.plants);
  assert.ok(result.modified.finalState.resources.plants >= 0);
});

test("unknown-world exchange rule affects measured inequality while conserving resources", () => {
  const result = runExperiment({ world: "unknown", steps: 6, seed: 4, modification: { exchangeRate: 0.45 } });
  assert.notEqual(result.comparison.resourceInequality.absoluteDifference, 0);
  assert.ok(Math.abs(result.modified.metrics.totalResources - result.baseline.metrics.totalResources) < 1e-8);
});

test("unknown connection trajectories and intervention events reflect the graph at each step", () => {
  const formed = runExperiment({ world: "unknown", steps: 2, seed: 5, modification: { connectionProbability: 1 } });
  assert.deepEqual(formed.baseline.trajectories[0].connections, worlds.unknown.definition.initialState.connections);
  assert.equal(formed.modified.trajectories[0].connections.length, 6);
  assert.ok(formed.modified.events.filter((event) => event.type === "connection_formed").every((event) => formed.modified.trajectories[event.step - 1].connections.some(([a, b]) => new Set([a, b]).has(event.agents[0]) && new Set([a, b]).has(event.agents[1]))));
  const removed = runExperiment({ world: "unknown", steps: 1, seed: 5, initialState: { ...structuredClone(worlds.unknown.definition.initialState), connectionProbability: 0 }, modification: { removeConnection: ["a", "b"] } });
  assert.ok(!removed.modified.trajectories[0].connections.some(([a, b]) => (a === "a" && b === "b") || (a === "b" && b === "a")));
  assert.ok(removed.modified.events.some((event) => event.type === "connection_removed" && event.step === 0 && event.agents.join("|") === "a|b"));
  const componentFinding = removed.findings.find((finding) => finding.metric === "connectedComponents");
  assert.ok(componentFinding.evidence.some(({ event }) => event.type === "connection_removed"));
});

test("surprise findings cite measured comparison values and real events", () => {
  const result = runExperiment({ world: "city", steps: 10, seed: 2, modification: { closeRoad: "central-work" }, surpriseThreshold: 0.01 });
  assert.ok(result.findings.length);
  for (const finding of result.findings) {
    assert.deepEqual(finding.values, { baseline: result.baseline.metrics[finding.metric], modified: result.modified.metrics[finding.metric], absoluteDifference: result.comparison[finding.metric].absoluteDifference, percentageDifference: result.comparison[finding.metric].percentageDifference });
    for (const item of finding.evidence) {
      const { scenario, eventIndex, ...sourceEvent } = item.event;
      assert.ok([...result.modified.events, ...result.baseline.events].some((event) => JSON.stringify(event) === JSON.stringify(sourceEvent)));
    }
  }
});

test("causes without supporting records remain explicitly unverified", () => {
  const findings = detectSurprises({ world: "city", threshold: 0.01, metrics: { mystery: { baseline: 2, modified: 8, absoluteDifference: 6, percentageDifference: 300 } }, baseline: { events: [] }, modified: { events: [] } });
  assert.equal(findings[0].evidenceStatus, "unverified_hypothesis");
  assert.equal(findings[0].confidence, "none");
});

test("zero baselines do not receive fabricated percentage changes", () => {
  assert.equal(compareMetrics({ count: 0 }, { count: 2 }).count.percentageDifference, null);
  assert.equal(compareMetrics({ count: 2 }, { count: 2 }).count.percentageDifference, 0);
});

test("invalid surprise thresholds are rejected", () => {
  assert.throws(() => runExperiment({ world: "city", steps: 1, surpriseThreshold: 2 }), { code: "INVALID_THRESHOLD" });
});

test("AI unconfigured mode works and AI suggestions are checked against world rules", async () => {
  const env = require("../src/config/env"), ai = require("../src/services/simulationAi.service"), previousKey = env.geminiApiKey;
  env.geminiApiKey = "";
  try {
    const response = await ai.suggest("city");
    assert.equal(response.mode, "deterministic");
    assert.ok(response.suggestions.length);
    const validated = ai.validateSuggestionCandidates("city", [
      { hypothesis: "A possible route shift", modification: { closeRoad: "central-work" } },
      { hypothesis: "Invented road", modification: { closeRoad: "nonexistent-road" } },
      { hypothesis: "Unknown control", modification: { fakeField: true } },
    ]);
    assert.equal(validated.length, 1);
  } finally { env.geminiApiKey = previousKey; }
});

test("Gemini provider failure falls back to deterministic suggestions", async () => {
  const env = require("../src/config/env"), ai = require("../src/services/simulationAi.service"), previousKey = env.geminiApiKey;
  env.geminiApiKey = "test-only-key";
  try {
    const response = await ai.suggest("ecosystem", {}, () => ({ models: { generateContent: async () => { throw new Error("simulated provider outage"); } } }));
    assert.equal(response.mode, "deterministic_fallback");
    assert.ok(response.suggestions.length);
  } finally { env.geminiApiKey = previousKey; }
});

test("health, routes, create/retrieve/compare, validation, suggestions and errors work", async () => {
  const app = require("../src/app"), routes = require("../src/routes/simulation.routes"), controller = require("../src/controllers/simulation.controller");
  const routePaths = routes.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.deepEqual(routePaths, ["/worlds", "/worlds/:world", "/experiments", "/experiments/recent", "/experiments/:id/comparison", "/experiments/:id", "/suggestions", "/explanations"]);
  assert.ok(app.router.stack.some((layer) => layer.route?.path === "/api/health"));
  assert.ok(!app.router.stack.some((layer) => layer.route?.path === "/api/assessments"));
  async function invoke(fn, req = {}) {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
    await fn(req, response, (error) => { throw error; }); return response;
  }
  let response = await invoke(app.router.stack.find((layer) => layer.route?.path === "/api/health").route.stack[0].handle);
  assert.equal(response.statusCode, 200); assert.equal(response.payload.simulationEngine, "ready"); assert.equal(response.payload.aiConfigured, require("../src/services/simulationAi.service").isConfigured());
  response = await invoke(controller.listWorlds); assert.equal(response.payload.worlds.length, 3);
  response = await invoke(controller.getWorld, { params: { world: "city" } }); assert.equal(response.statusCode, 200);
  response = await invoke(controller.getWorld, { params: { world: "nope" } }); assert.equal(response.statusCode, 404);
  response = await invoke(controller.createExperiment, { body: { world: "city", steps: 10, seed: 2, modification: { closeRoad: "central-work" } } });
  assert.equal(response.statusCode, 201); const created = response.payload.experiment;
  response = await invoke(controller.getExperiment, { params: { id: created.id } }); assert.equal(response.statusCode, 200); assert.equal(response.payload.experiment.id, created.id);
  response = await invoke(controller.getComparison, { params: { id: created.id } }); assert.equal(response.statusCode, 200);
  response = await invoke(controller.getExperiment, { params: { id: "no-such-experiment" } }); assert.equal(response.statusCode, 404);
  response = await invoke(controller.createExperiment, { body: { world: "city", steps: -1 } }); assert.equal(response.statusCode, 400);
  response = await invoke(controller.suggestions, { body: { world: "city" } }); assert.equal(response.statusCode, 200); assert.ok(response.payload.suggestions.length);
  response = await invoke(controller.explain, { body: { experimentId: created.id } }); assert.equal(response.statusCode, 200);
});
