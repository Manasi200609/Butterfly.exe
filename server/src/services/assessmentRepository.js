const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const env = require("../config/env");

const demoStore = new Map();
let mode = "demo";

async function connect() {
  if (!env.mongodbUri) return;
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 4000 });
    mode = "mongodb";
  } catch {
    mode = "demo";
    console.warn("MongoDB unavailable; using in-memory demo mode.");
  }
}

function getMode() { return mode; }
async function save(record) {
  if (mode === "mongodb") {
    const doc = await Assessment.create({ ...record, result: record });
    return { ...record, id: String(doc._id), createdAt: doc.createdAt };
  }
  demoStore.set(record.id, record);
  return record;
}
async function get(id) {
  if (mode === "mongodb") {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Assessment.findById(id).lean();
    return doc ? { ...doc.result, id: String(doc._id), createdAt: doc.createdAt } : null;
  }
  return demoStore.get(id) || null;
}
async function update(id, record) {
  if (mode === "mongodb") {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Assessment.findByIdAndUpdate(id, { ...record, result: { ...record, id } }, { new: true, runValidators: true });
    return doc ? { ...record, id: String(doc._id), createdAt: doc.createdAt } : null;
  }
  if (!demoStore.has(id)) return null;
  demoStore.set(id, record); return record;
}
module.exports = { connect, getMode, save, get, update };
