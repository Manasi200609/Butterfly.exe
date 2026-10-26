function validateAssessmentBody(body) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["Request body must be a JSON object."];
  if (typeof body.title !== "string" || body.title.trim().length < 2 || body.title.length > 160) errors.push("title must be a string between 2 and 160 characters.");
  if (typeof body.sourceText !== "string" || body.sourceText.trim().length < 20 || body.sourceText.length > 100000) errors.push("sourceText must contain 20 to 100000 characters.");
  if (body.applicantInfo !== undefined && (!body.applicantInfo || typeof body.applicantInfo !== "object" || Array.isArray(body.applicantInfo))) errors.push("applicantInfo must be an object.");
  if (body.availableDocuments !== undefined && (!Array.isArray(body.availableDocuments) || body.availableDocuments.some((x) => typeof x !== "string" || x.length > 160))) errors.push("availableDocuments must be an array of strings no longer than 160 characters each.");
  if (body.unavailableDocuments !== undefined && (!Array.isArray(body.unavailableDocuments) || body.unavailableDocuments.some((x) => typeof x !== "string" || x.length > 160))) errors.push("unavailableDocuments must be an array of strings no longer than 160 characters each.");
  return errors;
}
function validateReassessmentBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["Request body must be a JSON object."];
  const errors = [];
  if (body.applicantInfo !== undefined && (!body.applicantInfo || typeof body.applicantInfo !== "object" || Array.isArray(body.applicantInfo))) errors.push("applicantInfo must be an object.");
  if (body.availableDocuments !== undefined && (!Array.isArray(body.availableDocuments) || body.availableDocuments.some((x) => typeof x !== "string" || x.length > 160))) errors.push("availableDocuments must be an array of strings no longer than 160 characters each.");
  if (body.unavailableDocuments !== undefined && (!Array.isArray(body.unavailableDocuments) || body.unavailableDocuments.some((x) => typeof x !== "string" || x.length > 160))) errors.push("unavailableDocuments must be an array of strings no longer than 160 characters each.");
  if (body.applicantInfo === undefined && body.availableDocuments === undefined && body.unavailableDocuments === undefined) errors.push("Provide applicantInfo or reported documents to reassess.");
  return errors;
}
module.exports = { validateAssessmentBody, validateReassessmentBody };
