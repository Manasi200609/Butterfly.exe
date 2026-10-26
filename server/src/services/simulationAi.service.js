const env = require("../config/env");
function deterministicSuggestions(world) {
  const ideas = {
    city: [{ modification: { closeRoad: "central-work" }, hypothesis: "A closure may shift route choice and queue locations." }, { modification: { changeDemand: 2 }, hypothesis: "Higher demand may increase unmet trips or delay." }],
    ecosystem: [{ modification: { resourceDelta: -20 }, hypothesis: "Lower starting plant availability may affect population trajectories." }, { modification: { rainfall: 0.6 }, hypothesis: "Reduced rainfall may slow resource regeneration." }],
    unknown: [{ modification: { exchangeRate: 0.4 }, hypothesis: "Faster exchange may change resource inequality." }, { modification: { connectionProbability: 0.5 }, hypothesis: "More connection attempts may change cluster sizes." }],
  };
  return ideas[world] || [];
}
function validateSuggestionCandidates(world, candidates) {
  const { worlds, runExperiment } = require("../simulation/engine");
  if (!worlds[world] || !Array.isArray(candidates)) return [];
  return candidates.filter((item) => {
    if (!item || Object.keys(item).some((key) => !["modification", "hypothesis"].includes(key)) || typeof item.hypothesis !== "string" || item.hypothesis.trim().length < 4 || item.hypothesis.length > 500 || !item.modification || typeof item.modification !== "object" || Array.isArray(item.modification)) return false;
    try { runExperiment({ world, steps: 1, seed: 1, modification: item.modification }); return true; } catch { return false; }
  }).slice(0, 3);
}
async function suggest(world, context = {}, clientFactory) {
  if (!env.geminiApiKey) return { mode: "deterministic", suggestions: deterministicSuggestions(world), note: "Gemini is not configured; these are rule-based hypotheses, not outcomes." };
  try {
    const ai = clientFactory ? clientFactory(env.geminiApiKey) : new (require("@google/genai").GoogleGenAI)({ apiKey: env.geminiApiKey });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Return JSON only: {"suggestions":[{"modification":object,"hypothesis":string}]}. Suggest at most 3 experiments for world ${world}. Supported limits: ${JSON.stringify(require("../simulation/engine").worlds[world].definition.modifications)}. Context evidence: ${JSON.stringify(context).slice(0, 12000)}. These are hypotheses only; do not claim outcomes.`, config: { responseMimeType: "application/json" } });
    const parsed = JSON.parse(response.text);
    return { mode: "gemini", suggestions: validateSuggestionCandidates(world, parsed.suggestions), note: "Suggestions are hypotheses only; simulation results are computed separately." };
  } catch (error) { return { mode: "deterministic_fallback", suggestions: deterministicSuggestions(world), note: "Gemini was unavailable or returned an invalid suggestion; using deterministic hypotheses." }; }
}
async function explain(experiment) {
  const facts = experiment.findings.map(({ metric, values, evidenceStatus, evidence, candidateExplanation }) => ({ metric, values, evidenceStatus, evidence, candidateExplanation }));
  if (!env.geminiApiKey) return { mode: "evidence_based", explanation: facts, note: "Explanations use measured metrics and recorded events; causal claims remain qualified." };
  try {
    const { GoogleGenAI } = require("@google/genai"), ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Explain the following actual experiment findings using only these metrics and event evidence. If causality is not established, say uncertain. Return JSON {"explanations":[{"metric":string,"text":string,"evidenceStatus":"candidate_explanation"|"unverified_hypothesis"}]}. Findings: ${JSON.stringify(facts).slice(0, 12000)}`, config: { responseMimeType: "application/json" } });
    const result = JSON.parse(response.text), explanations = Array.isArray(result.explanations) ? result.explanations.filter((x) => facts.some((f) => f.metric === x.metric) && typeof x.text === "string" && x.text.length <= 1000 && ["candidate_explanation", "unverified_hypothesis"].includes(x.evidenceStatus)) : [];
    const safeExplanations = explanations.map((item) => {
      const fact = facts.find((candidate) => candidate.metric === item.metric);
      const status = fact.evidenceStatus === "unverified_hypothesis" ? "unverified_hypothesis" : item.evidenceStatus;
      return { metric: item.metric, text: status === "unverified_hypothesis" ? `Unverified hypothesis based on the measured change: ${item.text}` : item.text, evidenceStatus: status, evidence: fact.evidence };
    });
    return { mode: "gemini_evidence_grounded", explanations: safeExplanations, sourceFindings: facts };
  } catch { return { mode: "evidence_based_fallback", explanation: facts, note: "Gemini was unavailable or returned invalid output; showing measured evidence." }; }
}
module.exports = { suggest, explain, isConfigured: () => Boolean(env.geminiApiKey), validateSuggestionCandidates };
