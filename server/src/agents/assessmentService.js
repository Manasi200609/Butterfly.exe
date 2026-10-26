const { extractRequirements } = require("./requirementExtractor");
const { assessRequirements } = require("./prerequisiteValidator");
const { generateActionPlan } = require("./actionPlanGenerator");
const { createAiService } = require("../services/ai.service");

async function buildAssessment(input, existingRequirements) {
  const extracted = existingRequirements
    ? { requirements: existingRequirements, mode: "reassess" }
    : await extractRequirements(input.sourceText, createAiService());
  const requirements = assessRequirements(extracted.requirements, input.applicantInfo, input.availableDocuments, input.unavailableDocuments);
  const counts = requirements.reduce((acc, r) => (acc[r.status]++, acc), { satisfied: 0, missing: 0, unknown: 0 });
  const total = requirements.length;
  return {
    id: input.id,
    title: input.title,
    readiness: { label: "Preparation status", note: "This is not an official eligibility decision or prediction of award.", score: total ? Math.round((counts.satisfied / total) * 100) : null, ...counts, total },
    requirements,
    nextSteps: generateActionPlan(requirements),
    warnings: [extracted.warning, ...(total ? [] : ["No traceable requirements were identified. Paste a clearer notice or verify requirements with the issuing organization."])].filter(Boolean),
    unknowns: requirements.filter((r) => r.status === "unknown").map(({ id, text, explanation }) => ({ requirementId: id, text, explanation })),
    extractionMode: extracted.mode,
    createdAt: input.createdAt || new Date().toISOString(),
    sourceText: input.sourceText,
    applicantInfo: input.applicantInfo,
    availableDocuments: input.availableDocuments,
    unavailableDocuments: input.unavailableDocuments,
  };
}
module.exports = { buildAssessment };
