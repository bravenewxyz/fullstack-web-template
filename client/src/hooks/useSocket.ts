/**
 * Type-Safe Socket.IO Client Hook
 * 
 * Uses shared Zod schemas for type-safe events.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, StateInit } from "@shared/schemas";

// Type-safe socket
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketReturn {
  connected: boolean;
  counter: number;
  users: number;
  increment: () => void;
  decrement: () => void;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const [users, setUsers] = useState(0);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Connect to the same origin (works in dev and prod)
    const socket: TypedSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Type-safe event handlers!
    socket.on("state:init", (state: StateInit) => {
      setCounter(state.counter);
      setUsers(state.users);
    });

    socket.on("counter:update", (value) => {
      setCounter(value);
    });

    socket.on("users:count", (count) => {
      setUsers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Type-safe emitters!
  const increment = useCallback(() => {
    socketRef.current?.emit("counter:increment");
  }, []);

  const decrement = useCallback(() => {
    socketRef.current?.emit("counter:decrement");
  }, []);

  return {
    connected,
    counter,
    users,
    increment,
    decrement,
  };
}
