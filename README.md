# Fullstack Web Template

A modern fullstack TypeScript template with React, Express, tRPC, and PostgreSQL.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Radix UI, Phosphor Icons, Zustand, Framer Motion
- **Backend**: Express, tRPC v11, Drizzle ORM
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **LLM**: OpenRouter (access 200+ models)
- **Package Manager**: Bun

## Deploy to Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

**Zero configuration required!** The Dockerfile bundles PostgreSQL, Supabase Auth, and the Node.js app together.

### Option A: Fully Self-Contained (simplest)
1. Click "Deploy on Railway"
2. Add a Volume mounted at `/data` for persistent storage
3. Done! Your app has a database and auth system

### Option B: With Railway PostgreSQL (recommended for production)
1. Click "Deploy on Railway"
2. Add a PostgreSQL service in your Railway project
3. Set `DATABASE_URL` environment variable to the PostgreSQL connection string
4. The app will automatically use the external database (no volume needed)

## Quick Start (Local Development)

```bash
git clone https://github.com/bravenewxyz/fullstack-web-template.git my-app
cd my-app
bun install
cp .env.example .env  # Configure your environment variables
bun run docker:up     # Start local Supabase
bun run db:push       # Run migrations
bun run dev
```

## Scripts

```bash
bun run dev         # Start development server
bun run build       # Build for production
bun run start       # Run production server
bun run check       # TypeScript type checking
bun run test        # Run tests
bun run db:push     # Run database migrations

# Docker (self-hosted Supabase)
bun run docker:up   # Start local Supabase services
bun run docker:down # Stop local Supabase services
bun run docker:logs # View container logs
```

---

## Claude Code Setup Instructions

Copy the prompt below and send it to [Claude Code](https://claude.ai/code) to scaffold a new project based on this template:

````
Clone the fullstack web template from https://github.com/bravenewxyz/fullstack-web-template into a new directory called [PROJECT_NAME].

After cloning:
1. Update package.json with the new project name "[PROJECT_NAME]"
2. Create a .env file based on .env.example with these variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - DATABASE_URL
   - OPENROUTER_API_KEY (optional, for LLM features)
3. Run `bun install` to install dependencies
4. Run `bun run docker:up` to start local Supabase
5. Run `bun run db:push` to create database tables
6. Update the Home.tsx page title and content to reflect the new project

Then help me build: [DESCRIBE YOUR APP HERE]
````

Replace `[PROJECT_NAME]` with your desired project name and `[DESCRIBE YOUR APP HERE]` with what you want to build.

---

## Project Structure

```
├── client/           # React frontend
│   └── src/
│       ├── pages/        # Route components
│       ├── components/   # UI components (Radix + shadcn)
│       ├── hooks/        # Custom React hooks
│       ├── store/        # Zustand state management
│       └── lib/          # Utilities and tRPC client
├── server/           # Express backend
│   ├── lib/              # Infrastructure (tRPC, context, env)
│   ├── services/         # External APIs (LLM, maps, etc.)
│   ├── routers.ts        # tRPC router definitions
│   └── db.ts             # Database operations
├── shared/           # Shared types and constants
├── drizzle/          # Database schema and migrations
└── docker/           # Docker Compose for self-hosted Supabase
```

## License

MIT
