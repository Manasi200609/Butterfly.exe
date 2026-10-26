const definition = {
  id: "unknown", name: "The Unknown", description: "A small seeded network where agents exchange resources with neighbors.",
  rules: ["Each agent transfers a fraction of its resources to the poorest connected neighbor each step.", "Connections may form between previously disconnected agents at a configured probability.", "Agents with zero resources remain present but inactive."],
  initialState: { agents: [{ id: "a", resource: 12 }, { id: "b", resource: 4 }, { id: "c", resource: 2 }, { id: "d", resource: 8 }], connections: [["a", "b"], ["b", "c"]], exchangeRate: 0.2, connectionProbability: 0.1 },
  modifications: { exchangeRate: "number from 0 to 0.5", connectionProbability: "number from 0 to 1", resourceDelta: "number from -10 to 10 per agent", removeConnection: "pair of agent ids" },
  limits: { maxSteps: 100, maxStateItems: 50 },
};
function components(agents, connections) {
  const adj = new Map(agents.map((a) => [a.id, []]));
  for (const [a, b] of connections) if (adj.has(a) && adj.has(b)) { adj.get(a).push(b); adj.get(b).push(a); }
  const seen = new Set(), sizes = [];
  for (const id of adj.keys()) if (!seen.has(id)) { const stack = [id]; let size = 0; seen.add(id); while (stack.length) { const cur = stack.pop(); size++; for (const next of adj.get(cur)) if (!seen.has(next)) { seen.add(next); stack.push(next); } } sizes.push(size); }
  return sizes.sort((a, b) => b - a);
}
function gini(values) { const x = values.slice().sort((a, b) => a - b); const sum = x.reduce((a, b) => a + b, 0); return sum ? x.reduce((acc, value, index) => acc + (2 * (index + 1) - x.length - 1) * value, 0) / (x.length * sum) : null; }
function simulate({ initialState, modification = {}, steps = 10, seed = 1 }) {
  const state = structuredClone(initialState || definition.initialState), agents = state.agents, events = [], trajectories = [];
  if (!Array.isArray(agents) || !Array.isArray(state.connections) || agents.length > 50 || state.connections.length > 1225) throw Object.assign(new Error("Invalid or oversized unknown-world graph."), { status: 400, code: "INVALID_STATE" });
  const possibleEdges = agents.length * (agents.length - 1) / 2;
  const keys = state.connections.map((pair) => Array.isArray(pair) ? pair.slice().sort().join("\u0000") : "__invalid__");
  if (agents.some((a) => !a || typeof a.id !== "string" || !Number.isFinite(a.resource) || a.resource < 0 || a.resource > 1000000) || new Set(agents.map((a) => a?.id)).size !== agents.length || !Number.isFinite(state.exchangeRate) || state.exchangeRate < 0 || state.exchangeRate > 0.5 || !Number.isFinite(state.connectionProbability) || state.connectionProbability < 0 || state.connectionProbability > 1 || state.connections.length > possibleEdges || state.connections.some((pair) => !Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || pair.some((id) => !agents.some((a) => a.id === id)) || new Set(keys).size !== keys.length)) throw Object.assign(new Error("Invalid or oversized unknown-world graph."), { status: 400, code: "INVALID_STATE" });
  if (modification.exchangeRate !== undefined) state.exchangeRate = modification.exchangeRate;
  if (modification.connectionProbability !== undefined) state.connectionProbability = modification.connectionProbability;
  if (modification.resourceDelta !== undefined) for (const agent of agents) agent.resource = Math.max(0, agent.resource + modification.resourceDelta);
  if (modification.removeConnection) {
    const [first, second] = modification.removeConnection;
    if (!state.connections.some(([a, b]) => (a === first && b === second) || (a === second && b === first))) throw Object.assign(new Error("removeConnection must reference an existing connection."), { status: 400, code: "INVALID_MODIFICATION" });
    state.connections = state.connections.filter(([a, b]) => !((a === first && b === second) || (a === second && b === first)));
    events.push({ type: "connection_removed", step: 0, agents: [first, second], evidence: "connection removed by experiment before simulation steps" });
  }
  const random = require("../random").createRandom(seed);
  const connected = new Set(state.connections.map(([a, b]) => [a, b].sort().join("\u0000")));
  for (let step = 1; step <= steps; step++) {
    for (const [a, b] of state.connections) {
      const left = agents.find((x) => x.id === a), right = agents.find((x) => x.id === b);
      const donor = left.resource > right.resource ? left : right, receiver = donor === left ? right : left;
      const amount = Math.max(0, donor.resource * state.exchangeRate);
      donor.resource -= amount; receiver.resource += amount;
      if (amount > 0) events.push({ type: "resource_transfer", step, from: donor.id, to: receiver.id, amount: Number(amount.toFixed(4)), evidence: "transfer equals donor resources multiplied by exchangeRate" });
    }
    const ids = agents.map((a) => a.id);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const pair = [ids[i], ids[j]], key = pair.slice().sort().join("\u0000");
      if (!connected.has(key) && random() < state.connectionProbability) { connected.add(key); state.connections.push(pair); events.push({ type: "connection_formed", step, agents: pair, evidence: "seeded random draw was below connectionProbability" }); }
    }
    trajectories.push({ step, resources: Object.fromEntries(agents.map((a) => [a.id, Number(a.resource.toFixed(4))])), components: components(agents, state.connections), connections: state.connections.map((pair) => pair.slice()) });
  }
  const sizes = components(agents, state.connections), values = agents.map((a) => a.resource);
  return { finalState: state, metrics: { connectedComponents: sizes.length, clusterSizes: sizes, networkConnectivity: agents.length > 1 ? (2 * state.connections.length) / (agents.length * (agents.length - 1)) : 0, resourceInequality: gini(values), survivingAgents: agents.filter((a) => a.resource > 0).length, totalResources: values.reduce((a, b) => a + b, 0) }, trajectories, events };
}
module.exports = { definition, simulate };
