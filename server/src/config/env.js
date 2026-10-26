require("dotenv").config();

function positiveInteger(value, fallback, name) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

const env = {
  port: positiveInteger(process.env.PORT, 4000, "PORT"),
  // Vite binds to 127.0.0.1 in this project; allow both common local URLs.
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  mongodbUri: process.env.MONGODB_URI || "",
};

module.exports = env;
