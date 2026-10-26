const worlds = Object.fromEntries(["city", "ecosystem", "unknown"].map((id) => [id, require(`./worlds/${id}`)]));
const crypto = require("node:crypto");
const LIMITS = { maxSteps: 100, maxRequestBytes: 256 * 1024 };
function validateExperiment(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["Request body must be a JSON object."];
  const errors = [];
  for (const key of Object.keys(body)) if (!["world", "steps", "seed", "modification", "initialState", "surpriseThreshold"].includes(key)) errors.push(`Unsupported request field: ${key}.`);
  if (!worlds[body.world]) errors.push("world must be city, ecosystem, or unknown.");
  const stepLimit = worlds[body.world]?.definition.limits.maxSteps || LIMITS.maxSteps;
  if (!Number.isInteger(body.steps) || body.steps < 1 || body.steps > stepLimit) errors.push(`steps must be an integer from 1 to ${stepLimit} for this world.`);
  if (body.seed !== undefined && (!Number.isInteger(body.seed) || body.seed < 0 || body.seed > 4294967295)) errors.push("seed must be an unsigned 32-bit integer.");
  if (body.modification !== undefined && (!body.modification || typeof body.modification !== "object" || Array.isArray(body.modification))) errors.push("modification must be an object.");
  if (worlds[body.world] && body.modification && typeof body.modification === "object" && !Array.isArray(body.modification)) {
    const allowed = { city: ["closeRoad", "reduceCapacity", "changeDemand", "delayTransit"], ecosystem: ["resourceDelta", "rainfall", "regeneration", "removeSpecies"], unknown: ["exchangeRate", "connectionProbability", "resourceDelta", "removeConnection"] }[body.world];
    for (const key of Object.keys(body.modification)) if (!allowed.includes(key)) errors.push(`Unsupported ${body.world} modification: ${key}.`);
    const m = body.modification;
    if (body.world === "city" && m.closeRoad !== undefined && typeof m.closeRoad !== "string") errors.push("closeRoad must be a road id string.");
    if (body.world === "city" && m.reduceCapacity !== undefined && (!m.reduceCapacity || typeof m.reduceCapacity.roadId !== "string" || !Number.isInteger(m.reduceCapacity.amount) || m.reduceCapacity.amount < 1)) errors.push("reduceCapacity must contain a roadId and positive integer amount.");
    if (body.world === "city" && m.delayTransit !== undefined && (!m.delayTransit || !Number.isInteger(m.delayTransit.steps) || m.delayTransit.steps < 0 || m.delayTransit.steps > 10)) errors.push("delayTransit.steps must be an integer from 0 to 10.");
    if (body.world === "city" && m.changeDemand !== undefined && (!Number.isInteger(m.changeDemand) || m.changeDemand < -5 || m.changeDemand > 20)) errors.push("changeDemand must be an integer from -5 to 20.");
    if (body.world === "ecosystem" && m.resourceDelta !== undefined && (!Number.isFinite(m.resourceDelta) || m.resourceDelta < -100 || m.resourceDelta > 100)) errors.push("resourceDelta must be from -100 to 100.");
    if (body.world === "ecosystem" && m.rainfall !== undefined && (!Number.isFinite(m.rainfall) || m.rainfall < 0 || m.rainfall > 2)) errors.push("rainfall must be from 0 to 2.");
    if (body.world === "ecosystem" && m.regeneration !== undefined && (!Number.isFinite(m.regeneration) || m.regeneration < 0 || m.regeneration > 20)) errors.push("regeneration must be from 0 to 20.");
    if (body.world === "unknown" && m.exchangeRate !== undefined && (!Number.isFinite(m.exchangeRate) || m.exchangeRate < 0 || m.exchangeRate > 0.5)) errors.push("exchangeRate must be from 0 to 0.5.");
    if (body.world === "unknown" && m.connectionProbability !== undefined && (!Number.isFinite(m.connectionProbability) || m.connectionProbability < 0 || m.connectionProbability > 1)) errors.push("connectionProbability must be from 0 to 1.");
    if (body.world === "unknown" && m.resourceDelta !== undefined && (!Number.isFinite(m.resourceDelta) || m.resourceDelta < -10 || m.resourceDelta > 10)) errors.push("resourceDelta must be from -10 to 10.");
    if (body.world === "unknown" && m.removeConnection !== undefined && (!Array.isArray(m.removeConnection) || m.removeConnection.length !== 2 || m.removeConnection.some((id) => typeof id !== "string"))) errors.push("removeConnection must be a pair of agent ids.");
    if (body.world === "unknown" && m.removeConnection !== undefined && Array.isArray(m.removeConnection) && m.removeConnection.length === 2 && body.initialState?.agents && m.removeConnection.some((id) => !body.initialState.agents.some((a) => a.id === id))) errors.push("removeConnection must reference agents in initialState.");
  }
  if (body.initialState !== undefined && (!body.initialState || typeof body.initialState !== "object" || Array.isArray(body.initialState) || JSON.stringify(body.initialState).length > LIMITS.maxRequestBytes)) errors.push("initialState must be an object within the request size limit.");
  return errors;
}
function compareMetrics(base, changed) {
  const result = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(changed)])) {
    const before = base[key], after = changed[key];
    const numeric = typeof before === "number" && typeof after === "number" && Number.isFinite(before) && Number.isFinite(after);
    result[key] = { baseline: before ?? null, modified: after ?? null, absoluteDifference: numeric ? after - before : null, percentageDifference: numeric && before !== 0 ? ((after - before) / Math.abs(before)) * 100 : null };
  }
  return result;
}
function runExperiment(body) {
  const errors = validateExperiment(body);
  if (errors.length) throw Object.assign(new Error(errors.join(" ")), { status: 400, code: "VALIDATION_ERROR", details: errors });
  const world = worlds[body.world], initialState = structuredClone(body.initialState || world.definition.initialState), seed = body.seed ?? 1;
  if (body.surpriseThreshold !== undefined && (!Number.isFinite(body.surpriseThreshold) || body.surpriseThreshold < 0.01 || body.surpriseThreshold > 1)) throw Object.assign(new Error("surpriseThreshold must be from 0.01 to 1."), { status: 400, code: "INVALID_THRESHOLD" });
  const common = { initialState, steps: body.steps, seed };
  const baseline = world.simulate({ ...common, modification: {} });
  const modified = world.simulate({ ...common, modification: body.modification || {} });
  const metrics = compareMetrics(baseline.metrics, modified.metrics);
  const { detectSurprises } = require("./surpriseDetector");
  const findings = detectSurprises({ world: body.world, metrics, baseline, modified, threshold: body.surpriseThreshold ?? 0.15 });
  const now = new Date().toISOString(), id = crypto.randomUUID();
  return { id, world: body.world, createdAt: now, parameters: { steps: body.steps, seed, modification: body.modification || {}, initialState }, baseline: { metrics: baseline.metrics, finalState: baseline.finalState, trajectories: baseline.trajectories, events: baseline.events }, modified: { metrics: modified.metrics, finalState: modified.finalState, trajectories: modified.trajectories, events: modified.events }, comparison: metrics, findings, summary: { surpriseScore: findings.reduce((sum, item) => sum + item.score, 0), scoreFormula: "sum of min(1, abs(delta)/max(abs(baseline),1)) times severityWeight for threshold-crossing numeric metrics; heuristic only" }, limitations: ["Simplified illustrative simulation, not a validated forecast.", "Causal mechanisms are labeled only when supported by recorded simulation events."] };
}
module.exports = { worlds, LIMITS, validateExperiment, runExperiment, compareMetrics };
