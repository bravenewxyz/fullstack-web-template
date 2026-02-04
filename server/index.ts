import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./lib/context";
import { serveStatic, setupVite } from "./lib/vite";
import { logger } from "./lib/logSession";
import { ENV } from "./lib/env";
import { initializeSocket } from "./socket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize logger first - creates timestamped session folder
  logger.init();

  const log = logger.child("Server");

  const app = express();
  const server = createServer(app);

  // Initialize Socket.IO for real-time features
  initializeSocket(server);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Health check endpoint for Railway/container orchestration
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // In self-hosted mode, proxy /auth requests to Auth service
  if (ENV.isSelfHosted) {
    log.info("Self-hosted mode: proxying /auth to Auth service on localhost:9999");
    app.use(
      "/auth",
      createProxyMiddleware({
        target: "http://localhost:9999",
        changeOrigin: true,
        pathRewrite: { "^/auth": "" },
      })
    );
  }
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    log.info(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    log.info(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(err => {
  logger.error("Server", "Failed to start server", err);
  process.exit(1);
});
