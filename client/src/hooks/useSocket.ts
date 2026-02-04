import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface RealtimeState {
  counter: number;
  users: number;
}

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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the same origin (works in dev and prod)
    const socket = io({
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

    // Receive initial state
    socket.on("state:init", (state: RealtimeState) => {
      setCounter(state.counter);
      setUsers(state.users);
    });

    // Receive counter updates
    socket.on("counter:update", (value: number) => {
      setCounter(value);
    });

    // Receive user count updates
    socket.on("users:count", (count: number) => {
      setUsers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
