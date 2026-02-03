# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server with hot reload
bun run build        # Build client (Vite) and server (esbuild)
bun run start        # Run production server
bun run check        # TypeScript type checking
bun run test         # Run vitest tests (server/ only)
bun run test server/auth.logout.test.ts  # Run a single test file
bun run db:push      # Generate and run Drizzle migrations

# Docker (self-hosted Supabase)
bun run docker:up    # Start local Supabase services
bun run docker:down  # Stop local Supabase services
bun run docker:logs  # View container logs
```

## Architecture

This is a fullstack TypeScript monorepo with React frontend and Express backend connected via tRPC.

**Data Flow:**
```
React → tRPC Client (React Query) → /api/trpc → Express → tRPC Router → Drizzle ORM → PostgreSQL (Supabase)
```

### Key Directories

- `client/src/` - React app with Vite
  - `pages/` - Route components
  - `components/ui/` - Radix-based shadcn components
  - `store/` - Zustand stores (auth, theme, app state)
  - `lib/trpc.ts` - Typed tRPC client
  - `lib/supabase.ts` - Supabase client
- `server/` - Express backend
  - `lib/` - Infrastructure (tRPC setup, context, env, Supabase auth)
  - `services/` - External APIs (LLM via OpenRouter)
  - `routers.ts` - Main tRPC router definition
  - `db.ts` - Database operations
- `shared/` - Code shared between client and server
- `drizzle/` - Database schema and migrations

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*` (vitest only)

## Tech Stack

| Concern | Library |
|---------|---------|
| API | tRPC v11 |
| Auth | Supabase Auth |
| Database | PostgreSQL (via Supabase) |
| Client State | Zustand v5 (with persist middleware) |
| Server State | React Query v5 (via tRPC) |
| ORM | Drizzle |
| UI | Radix UI + Tailwind CSS v4 |
| Icons | Phosphor Icons |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Routing | Wouter |

## Authentication

Supabase Auth with client-side SDK. Auth tokens are passed via Authorization header to tRPC endpoints.

**Key files:**
- `client/src/lib/supabase.ts` - Supabase client
- `client/src/store/index.ts` - Auth store (useAuthStore)
- `client/src/lib/TrpcProvider.tsx` - tRPC client with auth headers
- `client/src/hooks/useAuth.ts` - Auth hook for components
- `server/lib/supabase.ts` - Supabase admin client for token verification
- `server/lib/context.ts` - Token verification and user lookup

**Procedure types:**
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires logged-in user
- `adminProcedure` - Requires admin role

## Adding Features

1. **Database**: Add table to `drizzle/schema.ts`, run `bun run db:push`
2. **Backend**: Add procedure to `server/routers.ts` using appropriate procedure type
3. **Frontend**: Create page in `client/src/pages/`, add route in `App.tsx`
4. **State**: Use tRPC queries for server data, Zustand for client state

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/postgres
```

Optional (for LLM features):
```
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

## Supabase Setup

1. Run `bun run docker:up` to start local Supabase
2. Copy keys from `docker/.env` to your `.env` file
3. Run `bun run db:push` to create tables
