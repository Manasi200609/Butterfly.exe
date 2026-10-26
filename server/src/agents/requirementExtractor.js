const { findEvidence, validateEvidence } = require("../utils/sourceEvidence");

const PATTERNS = [
  { regex: /(?:must|should|required to|need to|submit|provide|upload|attach|enclose)[^.!?\n]{0,160}/gi, category: "document" },
  { regex: /(?:deadline|last date|apply by|before|no later than)[^.!?\n]{0,100}/gi, category: "deadline" },
  { regex: /(?:eligible|eligibility|applicant must|applicants must)[^.!?\n]{0,160}/gi, category: "prerequisite" },
];

function deterministicExtract(sourceText) {
  const candidates = [];
  for (const pattern of PATTERNS) {
    for (const match of sourceText.matchAll(pattern.regex)) {
      const quote = match[0].trim().replace(/^[,;:\s]+|[,;:\s]+$/g, "");
      const evidence = findEvidence(sourceText, quote);
      if (evidence && quote.length >= 12) candidates.push({ quote, category: pattern.category, evidence });
    }
  }
  const unique = candidates.filter((item, index) => !candidates.some((other, otherIndex) => {
    if (index === otherIndex) return false;
    const sameStatement = item.evidence.start >= other.evidence.start && item.evidence.end <= other.evidence.end;
    const sameRequirement = other.quote.toLowerCase().includes(item.quote.toLowerCase());
    return sameStatement && sameRequirement && other.quote.length > item.quote.length;
  }));
  const seen = new Set();
  return unique.filter(({ quote }) => {
    const key = quote.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map((item, index) => ({
    id: `req-${index + 1}`, text: item.quote, category: item.category,
    deadline: item.category === "deadline" ? item.quote : null,
    mandatory: item.category === "deadline" ? null : /must|required|shall/i.test(item.quote),
    certainty: "explicit", evidence: item.evidence,
  }));
}

function validateRequirements(sourceText, requirements) {
  if (!Array.isArray(requirements)) return [];
  return requirements.filter((r) => r && typeof r.text === "string" && r.text.trim() &&
    typeof r.evidence?.quote === "string" && validateEvidence(sourceText, r.evidence))
    .map((r, i) => ({
      id: `req-${i + 1}`, text: r.text.trim().slice(0, 300),
      category: ["document", "deadline", "prerequisite", "other"].includes(r.category) ? r.category : "other",
      deadline: typeof r.deadline === "string" && r.deadline.trim() && sourceText.includes(r.deadline) ? r.deadline.trim() : null,
      mandatory: typeof r.mandatory === "boolean" ? r.mandatory : null,
      certainty: r.certainty === "interpretation" ? "interpretation" : "explicit", evidence: r.evidence,
    }));
}

async function extractRequirements(sourceText, aiService) {
  if (aiService?.isConfigured()) {
    try {
      const extracted = await aiService.extractRequirements(sourceText);
      const validated = validateRequirements(sourceText, extracted);
      if (validated.length) return { requirements: validated, mode: "gemini" };
    } catch (error) {
      return { requirements: deterministicExtract(sourceText), mode: "fallback", warning: "AI extraction was unavailable or returned unverifiable evidence; deterministic extraction was used." };
    }
  }
  return { requirements: deterministicExtract(sourceText), mode: "deterministic", warning: "Gemini is not configured; limited deterministic extraction was used. Review all requirements against the notice." };
}

module.exports = { extractRequirements, deterministicExtract, validateRequirements };
