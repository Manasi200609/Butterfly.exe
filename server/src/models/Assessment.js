const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 160 },
  sourceText: { type: String, required: true },
  applicantInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
  availableDocuments: { type: [String], default: [] },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Assessment", assessmentSchema);
