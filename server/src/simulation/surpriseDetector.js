const weights = { completedTrips: 1.2, unmetDemand: 1.5, congestionEvents: 1.3, totalDelay: 1.2, plantResource: 1.1, totalPopulation: 1.1, survivalRate: 1.4, connectedComponents: 1, networkConnectivity: 1, resourceInequality: 1.1, survivingAgents: 1.2 };
function detectSurprises({ world, metrics, baseline, modified, threshold = 0.15 }) {
  if (!Number.isFinite(threshold) || threshold < 0.01 || threshold > 1) throw Object.assign(new Error("surpriseThreshold must be from 0.01 to 1."), { status: 400, code: "INVALID_THRESHOLD" });
  const findings = [];
  for (const [metric, diff] of Object.entries(metrics)) {
    if (diff.absoluteDifference === null || Math.abs(diff.absoluteDifference) < 1e-9) continue;
    const normalizedChange = Math.abs(diff.absoluteDifference) / Math.max(1, Math.abs(diff.baseline));
    if (normalizedChange < threshold) continue;
    const records = [...modified.events.map((event, index) => ({ ...event, scenario: "modified", eventIndex: index })), ...baseline.events.map((event, index) => ({ ...event, scenario: "baseline", eventIndex: index }))];
    const relevantTypes = {
      congestionEvents: ["queue_wait", "road_closed"], totalDelay: ["queue_wait", "trip_completed", "road_closed"], averageTravelTime: ["trip_completed", "queue_wait", "road_closed"], completedTrips: ["trip_completed", "road_closed"], unmetDemand: ["trip_completed", "road_closed"],
      plantResource: ["population_decline"], totalPopulation: ["population_decline"], survivalRate: ["population_decline"], populationBalance: ["population_decline"],
      connectedComponents: ["connection_formed", "connection_removed"], networkConnectivity: ["connection_formed", "connection_removed"], clusterSizes: ["connection_formed", "connection_removed"], resourceInequality: ["resource_transfer"], survivingAgents: ["resource_transfer"], totalResources: ["resource_transfer"],
    }[metric] || [];
    const relevant = records.filter((event) => relevantTypes.includes(event.type)).slice(0, 8);
    const status = relevant.length ? "candidate_explanation" : "unverified_hypothesis";
    findings.push({ id: `${world}-${metric}`, label: "observed_change", metric, whatChanged: `${metric} changed by ${Number(diff.absoluteDifference.toFixed(4))}.`, values: { baseline: diff.baseline, modified: diff.modified, absoluteDifference: diff.absoluteDifference, percentageDifference: diff.percentageDifference }, flaggedBecause: `Normalized absolute change ${Number(normalizedChange.toFixed(4))} met threshold ${threshold}.`, evidence: relevant.map((event) => ({ scenario: event.scenario, eventIndex: event.eventIndex, event })), candidateExplanation: relevant.length ? `Recorded ${relevant.map((event) => event.type).join(", ")} events are temporally and mechanically relevant, but do not by themselves prove causality.` : "The measured change has no matching recorded mechanism; its cause is uncertain.", evidenceStatus: status, confidence: relevant.length ? "limited" : "none", score: Math.min(1, normalizedChange) * (weights[metric] || 1), suggestedFollowUp: `Repeat the ${world} experiment while changing one supported parameter at a time to isolate ${metric}.` });
  }
  return findings.sort((a, b) => b.score - a.score);
}
module.exports = { detectSurprises };
