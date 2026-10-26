
const app = require("./app");
const env = require("./config/env");
const repository = require("./services/experimentRepository");

if (typeof app.listen !== "function") {
  throw new TypeError(
    'Expected "./app" to export an Express application. Check app.js exports.'
  );
}

repository.connect().finally(() => {
const server = app.listen(env.port, () => {
  console.log(`Butterfly.exe API running at http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
  console.log(`Persistence mode: ${repository.getMode()}`);
});

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down Butterfly.exe API...`);

  server.close((error) => {
    if (error) {
      console.error("Shutdown failed:", error);
      process.exitCode = 1;
      return;
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
});
