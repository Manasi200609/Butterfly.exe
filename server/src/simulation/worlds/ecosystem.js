const definition = {
  id: "ecosystem", name: "The Ecosystem", description: "A discrete-step resource and population model for illustrative exploration.",
  rules: ["Plants regenerate up to carrying capacity, modified by rainfall.", "Herbivores consume plants; predators consume herbivores.", "Populations grow or decline by explicit consumption and survival rules, and cannot fall below zero."],
  initialState: { resources: { plants: 100, carryingCapacity: 120, regeneration: 8, rainfall: 1 }, species: [{ id: "rabbits", population: 30, food: "plants", consumption: 1, growth: 0.12 }, { id: "foxes", population: 8, food: "rabbits", consumption: 2, growth: 0.08 }] },
  modifications: { resourceDelta: "integer from -100 to 100", rainfall: "number from 0 to 2", regeneration: "number from 0 to 20", removeSpecies: "species id" },
  limits: { maxSteps: 100, maxStateItems: 20 },
};
function simulate({ initialState, modification = {}, steps = 10 }) {
  const state = structuredClone(initialState || definition.initialState), resources = state.resources, species = state.species;
  if (!resources || !Number.isFinite(resources.plants) || resources.plants < 0 || resources.plants > 1000000 || !Number.isFinite(resources.carryingCapacity) || resources.carryingCapacity < resources.plants || resources.carryingCapacity > 1000000 || !Number.isFinite(resources.regeneration) || resources.regeneration < 0 || resources.regeneration > 20 || !Number.isFinite(resources.rainfall) || resources.rainfall < 0 || resources.rainfall > 2 || !Array.isArray(species) || species.length > 20 || species.some((s) => !s || typeof s.id !== "string" || !Number.isFinite(s.population) || s.population < 0 || s.population > 1000000 || !Number.isFinite(s.consumption) || s.consumption < 0 || s.consumption > 100 || !Number.isFinite(s.growth) || s.growth < 0 || s.growth > 1)) throw Object.assign(new Error("Invalid or oversized ecosystem state."), { status: 400, code: "INVALID_STATE" });
  const initialSpeciesIds = species.map((item) => item.id);
  if (modification.removeSpecies && !species.some((s) => s.id === modification.removeSpecies)) throw Object.assign(new Error("removeSpecies must identify a species in the ecosystem."), { status: 400, code: "INVALID_MODIFICATION" });
  if (modification.removeSpecies) { const index = species.findIndex((s) => s.id === modification.removeSpecies); species.splice(index, 1); }
  if (modification.resourceDelta !== undefined) resources.plants = Math.max(0, resources.plants + modification.resourceDelta);
  if (modification.rainfall !== undefined) resources.rainfall = modification.rainfall;
  if (modification.regeneration !== undefined) resources.regeneration = modification.regeneration;
  const events = [], trajectories = [];
  for (let step = 0; step < steps; step++) {
    resources.plants = Math.min(resources.carryingCapacity, Math.max(0, resources.plants + resources.regeneration * resources.rainfall));
    for (const s of species) {
      const prey = resources[s.food] ?? species.find((p) => p.id === s.food)?.population ?? 0;
      const consumed = Math.min(prey, s.population * s.consumption);
      if (s.food === "plants") resources.plants = Math.max(0, resources.plants - consumed);
      else { const foodSpecies = species.find((p) => p.id === s.food); if (foodSpecies) foodSpecies.population = Math.max(0, foodSpecies.population - consumed); }
      const foodRatio = s.population ? Math.min(1, consumed / (s.population * s.consumption || 1)) : 0;
      const change = s.population * s.growth * foodRatio - s.population * 0.04 * (1 - foodRatio);
      s.population = Math.max(0, s.population + change);
      if (change < -0.01) events.push({ type: "population_decline", step: step + 1, speciesId: s.id, amount: Number((-change).toFixed(3)), evidence: { before: Number((s.population - change).toFixed(3)), after: Number(s.population.toFixed(3)) } });
    }
    trajectories.push({ step: step + 1, resources: { plants: Number(resources.plants.toFixed(3)) }, populations: Object.fromEntries(species.map((s) => [s.id, Number(s.population.toFixed(3))])) });
  }
  return { finalState: { resources, species }, metrics: { totalPopulation: species.reduce((sum, s) => sum + s.population, 0), speciesCount: species.length, plantResource: resources.plants, survivalRate: initialSpeciesIds.length ? initialSpeciesIds.filter((id) => species.some((s) => s.id === id && s.population > 0)).length / initialSpeciesIds.length : null, populationBalance: species.length ? 1 - (Math.max(...species.map((s) => s.population)) - Math.min(...species.map((s) => s.population))) / Math.max(1, species.reduce((sum, s) => sum + s.population, 0)) : 0 }, trajectories, events };
}
module.exports = { definition, simulate };
