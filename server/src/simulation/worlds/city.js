const definition = {
  id: "city", name: "The City", description: "A bounded commuter and road-capacity model.",
  rules: ["Commuters choose the shortest available route.", "Roads have per-step capacity; excess arrivals queue and add delay.", "A trip completes when the commuter reaches its destination within the horizon."],
  initialState: {
    intersections: ["home", "central", "market", "work"],
    roads: [
      { id: "home-central", from: "home", to: "central", capacity: 2, travelTime: 1 },
      { id: "central-work", from: "central", to: "work", capacity: 1, travelTime: 1 },
      { id: "home-market", from: "home", to: "market", capacity: 2, travelTime: 1 },
      { id: "market-work", from: "market", to: "work", capacity: 2, travelTime: 2 },
      { id: "central-market", from: "central", to: "market", capacity: 1, travelTime: 1 },
    ],
    commuters: Array.from({ length: 6 }, (_, index) => ({ id: `commuter-${index + 1}`, origin: "home", destination: "work", departure: 0 })),
  },
  modifications: { closeRoad: "road id", reduceCapacity: { roadId: "road id", amount: "positive integer" }, changeDemand: "integer from -5 to 20", delayTransit: { steps: "integer from 0 to 10" } },
  limits: { maxSteps: 30, maxStateItems: 100 },
};

function routeFor(roads, start, destination) {
  const dist = new Map([[start, 0]]), previous = new Map(), pending = new Set([start]);
  while (pending.size) {
    let current = null;
    for (const node of pending) if (current === null || dist.get(node) < dist.get(current)) current = node;
    pending.delete(current);
    if (current === destination) break;
    for (const road of roads.filter((edge) => edge.from === current && edge.capacity > 0)) {
      const next = dist.get(current) + road.travelTime;
      if (next < (dist.get(road.to) ?? Infinity)) { dist.set(road.to, next); previous.set(road.to, { node: current, road }); pending.add(road.to); }
    }
  }
  if (!previous.has(destination)) return [];
  const result = []; let node = destination;
  while (node !== start) { const item = previous.get(node); if (!item) return []; result.unshift(item.road); node = item.node; }
  return result;
}

function simulate({ initialState, modification = {}, steps = 10 }) {
  const state = structuredClone(initialState || definition.initialState);
  if (!Array.isArray(state.intersections) || state.intersections.length > 30 || state.intersections.some((node) => typeof node !== "string") || new Set(state.intersections).size !== state.intersections.length || !Array.isArray(state.roads) || !Array.isArray(state.commuters) || state.roads.length > 100 || state.commuters.length > 100 || state.roads.some((r) => !r || typeof r.id !== "string" || !state.intersections.includes(r.from) || !state.intersections.includes(r.to) || !Number.isInteger(r.capacity) || r.capacity < 0 || r.capacity > 100 || !Number.isInteger(r.travelTime) || r.travelTime < 1 || r.travelTime > 30) || state.commuters.some((c) => !c || typeof c.id !== "string" || !state.intersections.includes(c.origin) || !state.intersections.includes(c.destination) || !Number.isInteger(c.departure || 0) || (c.departure || 0) < 0 || (c.departure || 0) > 100)) throw Object.assign(new Error("Invalid or oversized city state."), { status: 400, code: "INVALID_STATE" });
  const events = [], trajectories = [], roads = state.roads.map((road) => ({ ...road, remaining: road.capacity, queue: 0 }));
  const closeId = modification.closeRoad;
  const target = roads.find((road) => road.id === closeId);
  if (closeId && !target) throw Object.assign(new Error("closeRoad must name a road in the city state."), { status: 400, code: "INVALID_MODIFICATION" });
  if (target) { target.capacity = 0; events.push({ type: "road_closed", step: 0, roadId: target.id, evidence: "capacity set to zero by experiment" }); }
  if (modification.reduceCapacity) {
    const road = roads.find((item) => item.id === modification.reduceCapacity.roadId);
    if (!road || !Number.isInteger(modification.reduceCapacity.amount) || modification.reduceCapacity.amount < 1) throw Object.assign(new Error("reduceCapacity must reference a road and a positive integer amount."), { status: 400, code: "INVALID_MODIFICATION" });
    road.capacity = Math.max(0, road.capacity - modification.reduceCapacity.amount);
  }
  const demandDelta = modification.changeDemand || 0;
  if (demandDelta > 0) for (let n = 0; n < demandDelta; n++) state.commuters.push({ id: `added-${n + 1}`, origin: "home", destination: "work", departure: 0 });
  if (demandDelta < 0) state.commuters.splice(Math.max(0, state.commuters.length + demandDelta), -demandDelta);
  if (state.commuters.length > 100) throw Object.assign(new Error("City demand exceeds 100 commuters."), { status: 400, code: "STATE_LIMIT" });
  if (modification.delayTransit !== undefined && (!Number.isInteger(modification.delayTransit.steps) || modification.delayTransit.steps < 0 || modification.delayTransit.steps > 10)) throw Object.assign(new Error("delayTransit.steps must be an integer from 0 to 10."), { status: 400, code: "INVALID_MODIFICATION" });
  const trips = state.commuters.map((person) => ({ ...person, path: routeFor(roads, person.origin, person.destination), index: 0, remaining: 0, elapsed: 0, done: false, roadId: null, progress: 0, queuePosition: 0, currentNode: person.origin, activeTravelTime: 0, status: "waiting" }));
  function completeTrip(trip, step) {
    trip.done = true;
    trip.status = "completed";
    trip.currentNode = trip.destination;
    trip.roadId = null;
    trip.progress = 1;
    events.push({ type: "trip_completed", step, commuterId: trip.id, route: trip.path.map((item) => item.id) });
  }
  for (let step = 0; step < steps; step++) {
    // Capacity and queue positions describe this step only. Queue-wait events
    // remain cumulative in `events` for the congestion metric.
    for (const road of roads) { road.remaining = road.capacity; road.queue = 0; }
    for (const trip of trips) {
      if (trip.done) continue;
      if (step < (trip.departure || 0) + (modification.delayTransit?.steps || 0)) { trip.status = "delayed"; continue; }
      if (!trip.path.length) { trip.elapsed++; trip.status = "no_route"; continue; }
      trip.elapsed++;
      if (trip.remaining > 0) {
        trip.remaining--;
        trip.progress = 1 - trip.remaining / trip.activeTravelTime;
        trip.status = "traveling";
        if (trip.remaining === 0) {
          if (trip.index >= trip.path.length) completeTrip(trip, step);
          else {
            trip.currentNode = roads.find((item) => item.id === trip.roadId)?.to || trip.currentNode;
            trip.roadId = null;
            trip.progress = 0;
          }
        }
        continue;
      }
      const road = trip.path[trip.index];
      if (road.remaining > 0) {
        road.remaining--;
        trip.remaining = road.travelTime - 1;
        trip.activeTravelTime = road.travelTime;
        trip.index++;
        trip.roadId = road.id;
        trip.currentNode = null;
        trip.progress = 1 / road.travelTime;
        trip.queuePosition = 0;
        trip.status = "traveling";
        if (trip.remaining === 0 && trip.index >= trip.path.length) completeTrip(trip, step);
      } else {
        road.queue++;
        trip.roadId = road.id;
        trip.currentNode = road.from;
        trip.progress = 0;
        trip.queuePosition = road.queue;
        trip.status = "queued";
        events.push({ type: "queue_wait", step, commuterId: trip.id, roadId: road.id, queue: road.queue });
      }
    }
    trajectories.push({ step: step + 1, completedTrips: trips.filter((trip) => trip.done).length, activeTrips: trips.filter((trip) => !trip.done).length, roadQueues: Object.fromEntries(roads.map((road) => [road.id, road.queue])), vehicles: trips.map((trip) => ({ id: trip.id, origin: trip.origin, destination: trip.destination, route: trip.path.map((item) => item.id), roadId: trip.roadId, progress: Number(trip.progress.toFixed(3)), queuePosition: trip.queuePosition, currentNode: trip.currentNode, status: trip.status, completed: trip.done })) });
  }
  const completed = trips.filter((trip) => trip.done), delay = trips.reduce((sum, trip) => sum + Math.max(0, trip.elapsed - (trip.path.reduce((s, road) => s + road.travelTime, 0) || steps)), 0);
  const metrics = { demand: trips.length, completedTrips: completed.length, unmetDemand: trips.length - completed.length, averageTravelTime: completed.length ? completed.reduce((sum, trip) => sum + trip.elapsed, 0) / completed.length : null, totalDelay: delay, congestionEvents: events.filter((event) => event.type === "queue_wait").length };
  return { finalState: { roads: roads.map(({ remaining, ...road }) => road), commuters: trips.map(({ path, index, remaining, ...trip }) => trip) }, metrics, trajectories, events };
}
module.exports = { definition, simulate };
