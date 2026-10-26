const crypto = require("node:crypto");
const repository = require("../services/assessmentRepository");
const { buildAssessment } = require("../agents/assessmentService");
const { validateAssessmentBody, validateReassessmentBody } = require("../validators/assessment.validator");

async function create(req, res, next) {
  try {
    const errors = validateAssessmentBody(req.body);
    if (errors.length) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid assessment request.", details: errors } });
    const input = { ...req.body, id: crypto.randomUUID(), applicantInfo: req.body.applicantInfo || {}, availableDocuments: req.body.availableDocuments || [], unavailableDocuments: req.body.unavailableDocuments || [] };
    const result = await buildAssessment(input);
    const saved = await repository.save(result);
    res.status(201).json({ assessment: saved, persistence: repository.getMode() });
  } catch (error) { next(error); }
}
async function getById(req, res, next) {
  try {
    if (!/^[a-f\d-]{36}$/i.test(req.params.id) && repository.getMode() === "demo") return res.status(404).json({ error: { code: "ASSESSMENT_NOT_FOUND", message: "Assessment not found." } });
    const assessment = await repository.get(req.params.id);
    if (!assessment) return res.status(404).json({ error: { code: "ASSESSMENT_NOT_FOUND", message: "Assessment not found." } });
    res.json({ assessment, persistence: repository.getMode() });
  } catch (error) { next(error); }
}
async function reassess(req, res, next) {
  try {
    const errors = validateReassessmentBody(req.body);
    if (errors.length) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid reassessment request.", details: errors } });
    const previous = await repository.get(req.params.id);
    if (!previous) return res.status(404).json({ error: { code: "ASSESSMENT_NOT_FOUND", message: "Assessment not found." } });
    const result = await buildAssessment({
      ...previous,
      applicantInfo: req.body.applicantInfo ?? previous.applicantInfo,
      availableDocuments: req.body.availableDocuments ?? previous.availableDocuments,
      unavailableDocuments: req.body.unavailableDocuments ?? previous.unavailableDocuments,
      createdAt: new Date().toISOString(),
    }, previous.requirements);
    const saved = await repository.update(req.params.id, result);
    res.json({ assessment: saved, persistence: repository.getMode() });
  } catch (error) { next(error); }
}
module.exports = { create, getById, reassess };
