const mongoose = require("mongoose");
const experimentSchema = new mongoose.Schema({
  experimentId: { type: String, required: true, unique: true, index: true },
  world: { type: String, enum: ["city", "ecosystem", "unknown"], required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
module.exports = mongoose.model("Experiment", experimentSchema);
