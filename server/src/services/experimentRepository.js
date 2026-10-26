const mongoose = require("mongoose");
const Experiment = require("../models/Experiment");
const env = require("../config/env");
const store = new Map();
let mode = "demo";
async function connect() {
  if (!env.mongodbUri) return;
  try { await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 4000 }); mode = "mongodb"; }
  catch { mode = "demo"; console.warn("MongoDB unavailable; using in-memory demo mode."); }
}
const getMode = () => mode;
async function save(result) {
  if (mode === "mongodb") {
    try { await Experiment.create({ experimentId: result.id, world: result.world, result }); return result; }
    catch { mode = "demo"; console.warn("MongoDB write failed; continuing in in-memory demo mode."); }
  }
  store.set(result.id, result); return result;
}
async function get(id) {
  if (mode === "mongodb") {
    try { const doc = await Experiment.findOne({ experimentId: id }).lean(); return doc?.result || null; }
    catch { mode = "demo"; console.warn("MongoDB read failed; continuing in in-memory demo mode."); }
  }
  return store.get(id) || null;
}
async function recent(limit = 25) {
  if (mode === "mongodb") {
    try { return (await Experiment.find().sort({ createdAt: -1 }).limit(limit).lean()).map((doc) => doc.result); }
    catch { mode = "demo"; console.warn("MongoDB query failed; continuing in in-memory demo mode."); }
  }
  return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
module.exports = { connect, getMode, save, get, recent };
