function generateActionPlan(requirements) {
  const actions = [];
  for (const r of requirements) {
    if (r.status === "missing" && r.mandatory === true) actions.push({ title: `Prepare: ${r.text}`, explanation: "This required item was reported unavailable. Check the notice or issuing organization for how to obtain it.", priority: "high", requirementId: r.id, completed: false, rank: 1 });
  }
  for (const r of requirements) {
    if (r.category === "deadline" || r.deadline) actions.push({ title: "Verify the application deadline", explanation: `The notice states: ${r.evidence.quote}`, priority: "high", requirementId: r.id, completed: false, rank: 2 });
  }
  for (const r of requirements) {
    if (r.status === "unknown" && r.category !== "deadline" && !r.deadline) actions.push({ title: `Verify: ${r.text}`, explanation: "Confirm whether this requirement applies and what evidence the issuing organization accepts.", priority: "medium", requirementId: r.id, completed: false, rank: 3 });
  }
  for (const r of requirements) {
    if (r.status === "missing" && r.mandatory !== true) actions.push({ title: `Check: ${r.text}`, explanation: "Confirm whether this item is required for your application and how to prepare it.", priority: "low", requirementId: r.id, completed: false, rank: 4 });
  }
  return actions.map(({ rank, ...action }, i) => ({ id: `action-${i + 1}`, ...action, _rank: rank }))
    .sort((a, b) => a._rank - b._rank).map(({ _rank, ...action }) => action);
}

module.exports = { generateActionPlan };
