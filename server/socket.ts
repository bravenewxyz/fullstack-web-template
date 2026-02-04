import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { logger } from "./lib/logSession";

const log = logger.child("Socket");

// Shared real-time state
let realtimeCounter = 0;
let connectedUsers = 0;

export function initializeSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    connectedUsers++;
    log.info(`User connected: ${socket.id} (${connectedUsers} online)`);

    // Send current state to newly connected client
    socket.emit("state:init", {
      counter: realtimeCounter,
      users: connectedUsers,
    });

    // Broadcast updated user count to all clients
    io.emit("users:count", connectedUsers);

    // Handle counter increment
    socket.on("counter:increment", () => {
      realtimeCounter++;
      io.emit("counter:update", realtimeCounter);
      log.info(`Counter incremented to ${realtimeCounter} by ${socket.id}`);
    });

    // Handle counter decrement
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
