function findEvidence(sourceText, quote) {
  if (typeof quote !== "string" || !quote.trim()) return null;
  const start = sourceText.indexOf(quote);
  return start < 0 ? null : { quote, start, end: start + quote.length };
}

function validateEvidence(sourceText, evidence) {
  if (!evidence || !Number.isInteger(evidence.start) || !Number.isInteger(evidence.end)) return false;
  if (evidence.start < 0 || evidence.end <= evidence.start || evidence.end > sourceText.length) return false;
  return sourceText.slice(evidence.start, evidence.end) === evidence.quote;
}

module.exports = { findEvidence, validateEvidence };
