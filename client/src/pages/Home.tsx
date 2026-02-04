import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { trpc } from "@/lib/trpc";
import { useAppStore } from "@/store";
import { motion } from "framer-motion";
import { ArrowRight, Code, Database, Lightning, CloudArrowUp, Broadcast, Users } from "@phosphor-icons/react";
import { Link } from "wouter";

const features = [
  {
    icon: Lightning,
    title: "Fast Development",
    description: "Hot reload, TypeScript, and modern tooling for rapid iteration.",
  },
  {
    icon: Database,
    title: "Full Stack",
    description: "React frontend with tRPC API and PostgreSQL database.",
  },
  {
    icon: Code,
    title: "Type Safe",
    description: "End-to-end type safety from database to UI components.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const { count, increment, decrement, reset } = useAppStore();

  // Server-persisted counter (tRPC)
  const utils = trpc.useUtils();
  const { data: serverCount = 0, isLoading: serverLoading } = trpc.counter.get.useQuery();
  const incrementServer = trpc.counter.increment.useMutation({
    onSuccess: () => utils.counter.get.invalidate(),
  });
  const decrementServer = trpc.counter.decrement.useMutation({
    onSuccess: () => utils.counter.get.invalidate(),
  });

  // Real-time WebSocket state
  const {
    connected,
    counter: realtimeCounter,
    users: onlineUsers,
    increment: incrementRealtime,
    decrement: decrementRealtime,
  } = useSocket();

  return (
    <div className="container py-8 sm:py-12 lg:py-16">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Fullstack Web Template
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-4">
          A modern stack for building production-ready web applications.
          React, tRPC, Supabase, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0 flex-wrap">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-11">
            <Link href="/showcase">
              View Components
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-11" asChild>
            <a
              href="https://github.com/bravenewxyz/fullstack-web-template"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </Button>
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2 sm:pb-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                  <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* Demo Cards */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto"
      >
        {/* Auth Status Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Auth Status</CardTitle>
            <CardDescription className="text-sm">Supabase authentication state</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full shrink-0 ${
                  loading
                    ? "bg-yellow-500 animate-pulse"
                    : user
                    ? "bg-green-500"
                    : "bg-muted"
                }`}
              />
              <span className="text-sm truncate">
                {loading
                  ? "Checking..."
                  : user
                  ? `Signed in as ${user.email}`
                  : "Not signed in"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Client Counter Demo Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Client State</CardTitle>
            <CardDescription className="text-sm">Zustand persisted locally</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <motion.span
                key={count}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl sm:text-3xl font-bold tabular-nums w-12 sm:w-16 text-center"
              >
                {count}
              </motion.span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={decrement}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span className="sm:hidden">-</span>
                  <span className="hidden sm:inline">-</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={reset}
                  className="h-10 px-4 sm:h-9"
                >
                  Reset
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={increment}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span className="sm:hidden">+</span>
                  <span className="hidden sm:inline">+</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Counter Demo Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              Server State
              <CloudArrowUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription className="text-sm">PostgreSQL persisted globally</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <motion.span
                key={serverCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl sm:text-3xl font-bold tabular-nums w-12 sm:w-16 text-center"
              >
                {serverLoading ? "..." : serverCount}
              </motion.span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => decrementServer.mutate()}
                  disabled={decrementServer.isPending || serverLoading}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span>-</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => incrementServer.mutate()}
                  disabled={incrementServer.isPending || serverLoading}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span>+</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time WebSocket Demo Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              Real-time State
              <Broadcast className="h-4 w-4 text-green-500" />
            </CardTitle>
            <CardDescription className="text-sm flex items-center gap-2">
              WebSocket instant sync
              <span className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                {onlineUsers} online
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    connected ? "bg-green-500" : "bg-red-500 animate-pulse"
                  }`}
                />
                <motion.span
                  key={realtimeCounter}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-2xl sm:text-3xl font-bold tabular-nums w-12 sm:w-16 text-center"
                >
                  {realtimeCounter}
                </motion.span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={decrementRealtime}
                  disabled={!connected}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span>-</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={incrementRealtime}
                  disabled={!connected}
                  className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span>+</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
