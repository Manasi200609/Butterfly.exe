const test = require("node:test");
const assert = require("node:assert/strict");
const { deterministicExtract, validateRequirements } = require("../src/agents/requirementExtractor");
const { assessRequirements } = require("../src/agents/prerequisiteValidator");
const { generateActionPlan } = require("../src/agents/actionPlanGenerator");
const { validateAssessmentBody } = require("../src/validators/assessment.validator");
const { extractRequirements } = require("../src/agents/requirementExtractor");

const notice = "Applicants must submit an income certificate. The deadline is 30 June 2027.";
const requirements = deterministicExtract(notice);

test("extracts only requirements with reproducible source evidence", () => {
  assert.ok(requirements.length >= 2);
  for (const r of requirements) assert.equal(notice.slice(r.evidence.start, r.evidence.end), r.evidence.quote);
  assert.equal(validateRequirements(notice, [{ text: "Made up", evidence: { quote: "Made up", start: 0, end: 7 } }]).length, 0);
});

test("reported available, unavailable, and unmentioned documents map to distinct statuses", () => {
  const requirement = requirements.find((r) => /income certificate/i.test(r.text));
  assert.equal(assessRequirements([requirement], {}, ["Income certificate"])[0].status, "satisfied");
  assert.equal(assessRequirements([requirement], {}, [], ["Income certificate"])[0].status, "missing");
  assert.equal(assessRequirements([requirement], {}, [])[0].status, "unknown");
});

test("invalid request fields are rejected", () => {
  assert.ok(validateAssessmentBody({}).length > 0);
  assert.deepEqual(validateAssessmentBody({ title: "Scholarship", sourceText: "This source notice has enough content." }), []);
});

test("actions prioritize explicitly missing mandatory requirements before deadline and unknown", () => {
  const actions = generateActionPlan([
    { id: "x", text: "Income certificate", status: "missing", mandatory: true },
    { id: "y", text: "Deadline 30 June", evidence: { quote: "Deadline 30 June" }, category: "deadline", status: "unknown" },
    { id: "z", text: "Minimum grades", status: "unknown", mandatory: true },
  ]);
  assert.equal(actions[0].requirementId, "x");
  assert.equal(actions[1].requirementId, "y");
  assert.equal(actions[2].requirementId, "z");
});

test("empty source extraction remains actionable", () => {
  assert.deepEqual(deterministicExtract("Official notice with no discernible requirement."), []);
});

test("missing AI provider uses deterministic extraction and clearly warns", async () => {
  const result = await extractRequirements(notice, { isConfigured: () => false });
  assert.equal(result.mode, "deterministic");
  assert.ok(result.warning);
  assert.ok(result.requirements.length);
});

test("untraceable or altered evidence is rejected", () => {
  const candidates = [{ text: "Must submit a bank statement", category: "document", evidence: { quote: "Must submit a bank statement", start: 0, end: 30 } }];
  assert.equal(validateRequirements("Notice says submit a transcript.", candidates).length, 0);
});

test("upload validation rejects unsupported extensions and mismatched MIME types", () => {
  const { validateUploadCandidate } = require("../src/utils/uploadValidation");
  assert.equal(validateUploadCandidate({ originalname: "notice.exe", mimetype: "application/pdf" }), false);
  assert.equal(validateUploadCandidate({ originalname: "notice.pdf", mimetype: "text/plain" }), false);
  assert.equal(validateUploadCandidate({ originalname: "notice.txt", mimetype: "text/plain" }), true);
  assert.equal(validateUploadCandidate({ originalname: "notice.txt", mimetype: "text/plain", size: 11 }, 10), false);
});
