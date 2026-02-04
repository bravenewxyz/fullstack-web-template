/**
 * Type-Safe Socket.IO Server
 * 
 * Uses shared Zod schemas for type-safe events.
 */

import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { logger } from "./lib/logSession";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/schemas";

const log = logger.child("Socket");

// Shared real-time state
let realtimeCounter = 0;
let connectedUsers = 0;

// Type-safe Socket.IO server
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function initializeSocket(httpServer: HttpServer): TypedServer {
  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    connectedUsers++;
    log.info(`User connected: ${socket.id} (${connectedUsers} online)`);

    // Send current state to newly connected client (type-safe!)
    socket.emit("state:init", {
      counter: realtimeCounter,
      users: connectedUsers,
    });

    // Broadcast updated user count to all clients
    io.emit("users:count", connectedUsers);

    // Handle counter increment (type-safe!)
    socket.on("counter:increment", () => {
      realtimeCounter++;
      io.emit("counter:update", realtimeCounter);
      log.info(`Counter incremented to ${realtimeCounter} by ${socket.id}`);
    });

    // Handle counter decrement (type-safe!)
    socket.on("counter:decrement", () => {
      realtimeCounter--;
      io.emit("counter:update", realtimeCounter);
      log.info(`Counter decremented to ${realtimeCounter} by ${socket.id}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      connectedUsers--;
      log.info(`User disconnected: ${socket.id} (${connectedUsers} online)`);
      io.emit("users:count", connectedUsers);
    });
  });

  log.info("Socket.IO initialized");
  return io;
}

// Export state getters for potential use in other modules
export function getRealtimeState() {
  return {
    counter: realtimeCounter,
    users: connectedUsers,
  };
}
