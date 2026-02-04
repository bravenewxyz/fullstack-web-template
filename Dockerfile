# Self-contained Supabase + Node.js app for Railway
# Runs PostgreSQL, Supabase Auth, and the Node.js app in a single container

FROM node:20-bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    postgresql-15 \
    postgresql-contrib-15 \
    supervisor \
    curl \
    wget \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Supabase Auth
ARG AUTH_VERSION=2.185.0
RUN wget -q https://github.com/supabase/auth/releases/download/v${AUTH_VERSION}/auth-v${AUTH_VERSION}-x86.tar.gz \
    && tar -xzf auth-v${AUTH_VERSION}-x86.tar.gz -C /usr/local/bin \
    && rm auth-v${AUTH_VERSION}-x86.tar.gz \
    && chmod +x /usr/local/bin/auth

# Install bun
RUN npm install -g bun

# Create directories
RUN mkdir -p /var/run/postgresql /var/log/supervisor /app /data/postgres
RUN chown -R postgres:postgres /var/run/postgresql /data/postgres

# Set up PostgreSQL data directory
ENV PGDATA=/data/postgres

# Copy application files
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Copy configuration files
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Self-hosted mode flag
ENV SELF_HOSTED=true

# Environment variables with defaults for self-hosted mode
ENV NODE_ENV=production
ENV PORT=3000
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres-password-change-me
ENV POSTGRES_DB=postgres
ENV DATABASE_URL=postgresql://postgres:postgres-password-change-me@localhost:5432/postgres

# Supabase Auth configuration (GOTRUE_* are the official env var names)
ENV GOTRUE_DB_DRIVER=postgres
ENV GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:postgres-password-change-me@localhost:5432/postgres?sslmode=disable
ENV GOTRUE_SITE_URL=http://localhost:3000
ENV GOTRUE_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ENV GOTRUE_JWT_EXP=3600
ENV GOTRUE_JWT_AUD=authenticated
ENV GOTRUE_DISABLE_SIGNUP=false
ENV GOTRUE_EXTERNAL_EMAIL_ENABLED=true
ENV GOTRUE_MAILER_AUTOCONFIRM=true
ENV GOTRUE_API_HOST=0.0.0.0
ENV GOTRUE_API_PORT=9999

# Supabase client config (will be set by entrypoint based on RAILWAY_PUBLIC_DOMAIN)
ENV VITE_SUPABASE_URL=""
ENV VITE_SUPABASE_ANON_KEY=placeholder
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
