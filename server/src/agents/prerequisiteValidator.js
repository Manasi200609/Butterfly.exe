function applicantHas(applicantInfo, availableDocuments, unavailableDocuments, requirement) {
  const text = requirement.text.toLowerCase();
  const words = text.match(/[a-z]{4,}/g) || [];
  const keyWords = words.filter((word) => !["must", "submit", "provide", "required", "applicant", "document", "certificate", "upload", "attach", "should"].includes(word));
  const matchesRequirement = (labels) => labels.some((label) => {
    const normalized = String(label).toLowerCase();
    return keyWords.some((word) => normalized.includes(word));
  });
  if (matchesRequirement(unavailableDocuments)) return { status: "missing", explanation: "You explicitly reported that this item is unavailable." };
  if (matchesRequirement(availableDocuments)) return { status: "satisfied", explanation: "You explicitly reported that this item is available." };
  for (const [key, value] of Object.entries(applicantInfo || {})) {
    if (keyWords.some((word) => key.toLowerCase().includes(word)) && (value === false || value === "no" || value === "missing")) return { status: "missing", explanation: "Your reported information indicates this prerequisite is not met." };
    if (keyWords.some((word) => key.toLowerCase().includes(word)) && (value === true || value === "yes" || value === "available")) return { status: "satisfied", explanation: "Your reported information indicates this prerequisite is met." };
  }
  if (requirement.mandatory === false) return { status: "unknown", explanation: "This appears optional; confirm whether it applies to your application." };
  return { status: "unknown", explanation: "You have not provided enough information to confirm whether this requirement is met." };
}

function assessRequirements(requirements, applicantInfo = {}, availableDocuments = [], unavailableDocuments = []) {
  return requirements.map((requirement) => ({ ...requirement, ...applicantHas(applicantInfo, availableDocuments, unavailableDocuments, requirement) }));
}

module.exports = { assessRequirements, applicantHas };
