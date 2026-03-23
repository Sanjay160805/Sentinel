import "./config";
import { startAgent } from "./agent";
import { logger } from "./logger";

process.on("uncaughtException", (err) => {
  logger.error(`[Process] Uncaught exception: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`[Process] Unhandled rejection: ${reason}`);
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("[Process] Shutting down.");
  process.exit(0);
});

startAgent().catch((err) => {
  logger.error(`[Process] Fatal: ${err}`);
  process.exit(1);
});
