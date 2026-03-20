/**
 * SENTINEL Express API Server
 * REST endpoints + WebSocket for real-time autonomous monitoring
 * Orchestrates agent cycles and dashboard communication
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

import { runAutonomousCycle, runChatCycle, agentStatus } from "../agent/sentinelAgent.js";
import { getHederaClient } from "../hedera/hederaClient.js";
import { AgentDecision } from "../types/index.js";

dotenv.config();

// ════════════════════════════════════════════════════════════════
// SERVER SETUP
// ════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../frontend")));

// ════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER
// ════════════════════════════════════════════════════════════════

const connectedClients = new Set<any>();

/**
 * Broadcast decision update to all connected WebSocket clients
 */
function broadcastDecision(decision: AgentDecision): void {
  const message = {
    type: "decision",
    data: decision,
    timestamp: new Date().toISOString(),
  };

  const messageStr = JSON.stringify(message);
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      try {
        client.send(messageStr);
      } catch (err) {
        console.error("❌ WebSocket send error:", err);
      }
    }
  });
}

/**
 * Broadcast status update to all connected clients
 */
function broadcastStatus(): void {
  const message = {
    type: "status",
    data: {
      isRunning: agentStatus.isRunning,
      cycleCount: agentStatus.cycleCount,
      lastDecision: agentStatus.lastDecision,
      threatsDetected: agentStatus.threatsDetected,
      connectedClients: connectedClients.size,
      uptime: process.uptime(),
    },
    timestamp: new Date().toISOString(),
  };

  const messageStr = JSON.stringify(message);
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(messageStr);
      } catch (err) {
        console.error("❌ WebSocket send error:", err);
      }
    }
  });
}

/**
 * WebSocket connection handler
 */
wss.on("connection", (ws) => {
  console.log(`✓ WebSocket client connected (${connectedClients.size + 1} total)`);
  connectedClients.add(ws);

  // Send initial status on connect
  broadcastStatus();

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "run_cycle") {
        console.log("📡 Client requested manual cycle");
        agentStatus.isRunning = true;
        const decision = await runAutonomousCycle();
        agentStatus.lastDecision = decision;
        agentStatus.cycleCount++;
        agentStatus.isRunning = false;

        broadcastDecision(decision);
        broadcastStatus();
      }

      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      }
    } catch (err) {
      console.error("❌ WebSocket message error:", err);
    }
  });

  ws.on("close", () => {
    connectedClients.delete(ws);
    console.log(`✓ WebSocket client disconnected (${connectedClients.size} remaining)`);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err);
    connectedClients.delete(ws);
  });
});

// ════════════════════════════════════════════════════════════════
// REST API ENDPOINTS
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/status
 * Returns current agent status and stats
 */
app.get("/api/status", (_req: Request, res: Response) => {
  try {
    res.json({
      status: "operational",
      isRunning: agentStatus.isRunning,
      cycleCount: agentStatus.cycleCount,
      lastDecision: agentStatus.lastDecision,
      threatsDetected: agentStatus.threatsDetected,
      connectedClients: connectedClients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/status error:", err);
    res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * GET /api/decision
 * Returns last decision
 */
app.get("/api/decision", (_req: Request, res: Response) => {
  try {
    if (!agentStatus.lastDecision) {
      return res.json({ message: "No decision made yet" });
    }

    return res.json(agentStatus.lastDecision);
  } catch (err) {
    console.error("❌ /api/decision error:", err);
    return res.status(500).json({ error: "Failed to get decision" });
  }
});

/**
 * POST /api/agent/run
 * Triggers one autonomous cycle manually
 */
app.post("/api/agent/run", async (_req: Request, res: Response) => {
  try {
    if (agentStatus.isRunning) {
      return res.status(429).json({ error: "Agent already running" });
    }

    console.log("⚡ Manual cycle triggered via API");
    agentStatus.isRunning = true;

    const decision = await runAutonomousCycle();
    agentStatus.lastDecision = decision;
    agentStatus.cycleCount++;

    if (
      decision.threat === "HIGH" ||
      decision.threat === "CRITICAL"
    ) {
      agentStatus.threatsDetected++;
    }

    agentStatus.isRunning = false;

    broadcastDecision(decision);
    broadcastStatus();

    return res.json({
      success: true,
      decision,
      cycleCount: agentStatus.cycleCount,
    });
  } catch (err) {
    agentStatus.isRunning = false;
    console.error("❌ /api/agent/run error:", err);
    return res.status(500).json({
      error: "Failed to run agent cycle",
      details: err instanceof Error ? err.message : "unknown",
    });
  }
});

/**
 * POST /api/agent/chat
 * Chat interface - ask SENTINEL questions
 */
app.post("/api/agent/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "Message too long (max 500 chars)" });
    }

    console.log(`💬 Chat request: ${message}`);
    const response = await runChatCycle(message);

    return res.json({
      userMessage: message,
      agentResponse: response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/agent/chat error:", err);
    return res.status(500).json({
      error: "Failed to process chat",
      details: err instanceof Error ? err.message : "unknown",
    });
  }
});

/**
 * GET /api/stats
 * Returns statistics about agent performance
 */
app.get("/api/stats", (_req: Request, res: Response) => {
  try {
    res.json({
      cycleCount: agentStatus.cycleCount,
      threatsDetected: agentStatus.threatsDetected,
      connectedClients: connectedClients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/stats error:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET / (root)
 * Serves dashboard
 */
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// ════════════════════════════════════════════════════════════════
// SERVER STARTUP AND AUTONOMOUS LOOP
// ════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONITORING_INTERVAL_MS = parseInt(
  process.env.MONITORING_INTERVAL_MS || "60000",
  10,
);

async function startServer() {
  try {
    console.log("\n🚀 ════════════════════════════════════════════════════");
    console.log("   SENTINEL Agent Server Initializing");
    console.log("   ════════════════════════════════════════════════════\n");

    // Initialize Hedera client
    console.log("📡 Initializing Hedera Hashgraph client...");
    try {
      getHederaClient();
      console.log("✓ Hedera client ready\n");
    } catch (err) {
      console.warn(
        "⚠  Hedera client initialization warning (non-critical):",
        err instanceof Error ? err.message : "unknown",
      );
    }

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`✓ Server listening on http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/`);
      console.log(`⚙  API: http://localhost:${PORT}/api/status`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}\n`);
    });

    // Start autonomous monitoring loop
    console.log(
      `⏱  Starting autonomous monitoring loop (${MONITORING_INTERVAL_MS}ms interval)\n`,
    );
    console.log("════════════════════════════════════════════════════\n");

    setInterval(async () => {
      try {
        agentStatus.isRunning = true;
        console.log(`⚡ [Cycle #${agentStatus.cycleCount + 1}] Starting autonomous cycle...`);

        const decision = await runAutonomousCycle();
        agentStatus.lastDecision = decision;
        agentStatus.cycleCount++;

        // Track threats
        if (decision.threat === "HIGH" || decision.threat === "CRITICAL") {
          agentStatus.threatsDetected++;
          console.log(`🚨 [Threat Detected] ${decision.threat} threat level`);
        }

        console.log(`✓ [Cycle #${agentStatus.cycleCount}] Decision: ${decision.action}`);

        // Broadcast to all connected clients
        broadcastDecision(decision);
        broadcastStatus();

        agentStatus.isRunning = false;
      } catch (err) {
        agentStatus.isRunning = false;
        console.error(
          "❌ Autonomous cycle error:",
          err instanceof Error ? err.message : "unknown",
        );

        broadcastStatus();
      }
    }, MONITORING_INTERVAL_MS);
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// ════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════

process.on("SIGINT", () => {
  console.log("\n👋 Received shutdown signal");
  console.log(`📊 Final stats: ${agentStatus.cycleCount} cycles, ${agentStatus.threatsDetected} threats detected`);

  // Close all WebSocket connections
  connectedClients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    console.log("✓ Server closed gracefully");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.log("❌ Forced shutdown (timeout)");
    process.exit(1);
  }, 10000);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Received terminate signal");
  server.close(() => {
    console.log("✓ Server terminated");
    process.exit(0);
  });
});

// ════════════════════════════════════════════════════════════════
// START!
// ════════════════════════════════════════════════════════════════

startServer();

