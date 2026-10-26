const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const repository = require("./services/experimentRepository");
const simulationRoutes = require("./routes/simulation.routes");
const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.clientOrigin.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "256kb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "tiny", { skip: (req) => req.path === "/api/health" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Butterfly.exe simulation API is healthy", simulationEngine: "ready", aiConfigured: Boolean(env.geminiApiKey), persistence: repository.getMode(), databaseConfigured: repository.getMode() === "mongodb" }));
app.use("/api", simulationRoutes);
app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } }));
app.use((error, _req, res, _next) => {
  const status = error.status || (error.type === "entity.too.large" ? 413 : 500);
  const message = status === 500 ? "The server could not complete the request." : error.type === "entity.too.large" ? "Request body exceeds the 256 KB limit." : error.message;
  if (status === 500) console.error("Request failed:", error.message);
  res.status(status).json({ error: { code: error.code || (status === 413 ? "REQUEST_TOO_LARGE" : "REQUEST_ERROR"), message, ...(error.details ? { details: error.details } : {}) } });
});
module.exports = app;
