#!/bin/bash
set -e

echo "=== Self-Hosted Supabase + App Entrypoint ==="

# Check if external DATABASE_URL is provided (not localhost)
USE_EXTERNAL_DB=false
if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ "@localhost" ]] && [[ ! "$DATABASE_URL" =~ "@127.0.0.1" ]]; then
    USE_EXTERNAL_DB=true
    echo "External DATABASE_URL detected - using external PostgreSQL"
fi

# Generate secure JWT secret if not provided (GOTRUE_* are official Auth env var names)
if [ "$GOTRUE_JWT_SECRET" = "your-super-secret-jwt-token-with-at-least-32-characters" ] || [ -z "$GOTRUE_JWT_SECRET" ]; then
    export GOTRUE_JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated random JWT secret"
fi

# Generate anon and service role keys using the JWT secret
# These are JWTs with specific roles
generate_jwt() {
    local role=$1
    local secret=$GOTRUE_JWT_SECRET
    local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '\n=' | tr '+/' '-_')
    local payload=$(echo -n "{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":$(($(date +%s) + 315360000))}" | base64 | tr -d '\n=' | tr '+/' '-_')
    local signature=$(echo -n "$header.$payload" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr -d '\n=' | tr '+/' '-_')
    echo "$header.$payload.$signature"
}

if [ "$VITE_SUPABASE_ANON_KEY" = "placeholder" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    export VITE_SUPABASE_ANON_KEY=$(generate_jwt "anon")
    echo "Generated anon key"
fi

if [ "$SUPABASE_SERVICE_ROLE_KEY" = "placeholder" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    export SUPABASE_SERVICE_ROLE_KEY=$(generate_jwt "service_role")
    echo "Generated service role key"
fi

# Set up URLs based on Railway environment
if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
    export GOTRUE_SITE_URL="https://$RAILWAY_PUBLIC_DOMAIN"
    export API_EXTERNAL_URL="https://$RAILWAY_PUBLIC_DOMAIN/auth"
    # Client uses /auth path on same origin in self-hosted mode
    export VITE_SUPABASE_URL=""
    echo "Configured for Railway domain: $RAILWAY_PUBLIC_DOMAIN"
else
    export GOTRUE_SITE_URL="http://localhost:${PORT:-3000}"
    export API_EXTERNAL_URL="http://localhost:9999"
    export VITE_SUPABASE_URL=""
fi

# Auth service configuration (GOTRUE_* are official Auth env var names)
export GOTRUE_OPERATOR_TOKEN=$SUPABASE_SERVICE_ROLE_KEY
export GOTRUE_JWT_AUD="authenticated"

# Logging configuration
export GOTRUE_LOG_LEVEL="info"
export GOTRUE_LOG_FILE="/dev/stdout"

# Explicitly set deprecated env vars to empty to suppress warnings
# (GoTrue has internal defaults that trigger warnings if not overridden)
export GOTRUE_JWT_DEFAULT_GROUP_NAME=""
export GOTRUE_JWT_ADMIN_GROUP_NAME=""

if [ "$USE_EXTERNAL_DB" = true ]; then
    # Using external database - set Auth service to use the same DATABASE_URL
    # Add sslmode if not present
    if [[ "$DATABASE_URL" =~ "?" ]]; then
        export GOTRUE_DB_DATABASE_URL="${DATABASE_URL}&sslmode=require"
    else
        export GOTRUE_DB_DATABASE_URL="${DATABASE_URL}?sslmode=require"
    fi
    
    # Disable local PostgreSQL in supervisord, shorter startup delays
    export AUTOSTART_POSTGRES=false
    export AUTH_STARTUP_DELAY=2
    export APP_STARTUP_DELAY=5
    
    echo "=== Starting services (external DB) ==="
    echo "DATABASE_URL: [external]"
    echo "Auth Site URL: $GOTRUE_SITE_URL"
    echo "Self-hosted mode: Auth available at /auth"
else
    # Using self-contained PostgreSQL
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
    # Auth service uses supabase_auth_admin role which owns the auth schema
    export GOTRUE_DB_DATABASE_URL="postgresql://supabase_auth_admin:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"
    
    # Enable local PostgreSQL in supervisord, longer startup delays
    export AUTOSTART_POSTGRES=true
    export AUTH_STARTUP_DELAY=5
    export APP_STARTUP_DELAY=10
    
    # Ensure data directory exists with correct permissions
    mkdir -p /data/postgres
    chown -R postgres:postgres /data/postgres

    # Initialize PostgreSQL if needed
    if [ ! -f "/data/postgres/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database..."
        # Use --auth-local and --auth-host to suppress "trust authentication" warning
        su postgres -c "/usr/lib/postgresql/15/bin/initdb -D /data/postgres --auth-local=trust --auth-host=md5" 2>&1
        
        # Configure PostgreSQL
        echo "host all all 0.0.0.0/0 md5" >> /data/postgres/pg_hba.conf
        echo "host all all 127.0.0.1/32 trust" >> /data/postgres/pg_hba.conf
        echo "local all all trust" >> /data/postgres/pg_hba.conf
        echo "listen_addresses = 'localhost'" >> /data/postgres/postgresql.conf
        # Send PostgreSQL logs to stdout instead of stderr
        echo "logging_collector = off" >> /data/postgres/postgresql.conf
        echo "log_destination = 'stderr'" >> /data/postgres/postgresql.conf
        
        # Start PostgreSQL temporarily to create user and database
        su postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /data/postgres -w start"
        
        # Set postgres password and create roles/schema for Auth service
        su postgres -c "psql -c \"ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';\""
        
        # Create base roles for RLS
        su postgres -c "psql -c \"CREATE ROLE anon NOLOGIN NOINHERIT;\""
        su postgres -c "psql -c \"CREATE ROLE authenticated NOLOGIN NOINHERIT;\""
        su postgres -c "psql -c \"CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;\""
        
        # Create supabase_auth_admin role for Auth service
        su postgres -c "psql -c \"CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '${POSTGRES_PASSWORD}';\""
        su postgres -c "psql -c \"ALTER ROLE supabase_auth_admin SET search_path TO auth, public;\""
        su postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;\""
        
        # Create auth schema owned by supabase_auth_admin
        su postgres -c "psql -c \"CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;\""
        
        # Pre-create GoTrue's schema_migrations table to avoid "does not exist" error on first run
        su postgres -c "psql -c \"CREATE TABLE IF NOT EXISTS auth.schema_migrations (version VARCHAR(14) NOT NULL PRIMARY KEY);\""
        su postgres -c "psql -c \"ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;\""
        
        # Grant permissions
        su postgres -c "psql -c \"GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\""
        su postgres -c "psql -c \"GRANT CREATE ON SCHEMA public TO supabase_auth_admin;\""
        
        # Create required extensions
        su postgres -c "psql -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";'"
        su postgres -c "psql -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'"
        
        # Run Drizzle migrations (run directly to avoid bun echoing command to stderr)
        echo "Running database migrations..."
        cd /app && ./node_modules/.bin/drizzle-kit generate && ./node_modules/.bin/drizzle-kit migrate || echo "Migrations may need to run again on next start"
        
        su postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /data/postgres -w stop"
        echo "PostgreSQL initialized"
    else
        echo "PostgreSQL already initialized"
    fi

    # Ensure data directory has correct permissions
    chown -R postgres:postgres /data/postgres

    echo "=== Starting services (self-contained DB) ==="
    echo "DATABASE_URL: postgresql://${POSTGRES_USER}:***@localhost:5432/${POSTGRES_DB}"
    echo "Auth Site URL: $GOTRUE_SITE_URL"
    echo "Self-hosted mode: Auth available at /auth"
fi

exec "$@"
