#!/bin/bash
set -e

echo "=== Self-Hosted Supabase + App Entrypoint ==="

# Check if external DATABASE_URL is provided (not localhost)
USE_EXTERNAL_DB=false
if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ "@localhost" ]] && [[ ! "$DATABASE_URL" =~ "@127.0.0.1" ]]; then
    USE_EXTERNAL_DB=true
    echo "External DATABASE_URL detected - using external PostgreSQL"
fi

# Generate secure keys if not provided
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
    # Client uses /auth path on same origin in self-hosted mode
    export VITE_SUPABASE_URL=""
    echo "Configured for Railway domain: $RAILWAY_PUBLIC_DOMAIN"
else
    export GOTRUE_SITE_URL="http://localhost:${PORT:-3000}"
    export VITE_SUPABASE_URL=""
fi

# GoTrue operator token for admin API
export GOTRUE_OPERATOR_TOKEN=$SUPABASE_SERVICE_ROLE_KEY

if [ "$USE_EXTERNAL_DB" = true ]; then
    # Using external database - set GoTrue to use the same DATABASE_URL
    # Add sslmode if not present
    if [[ "$DATABASE_URL" =~ "?" ]]; then
        export GOTRUE_DB_DATABASE_URL="${DATABASE_URL}&sslmode=require"
    else
        export GOTRUE_DB_DATABASE_URL="${DATABASE_URL}?sslmode=require"
    fi
    
    # Disable local PostgreSQL in supervisord, shorter startup delays
    export AUTOSTART_POSTGRES=false
    export GOTRUE_STARTUP_DELAY=2
    export APP_STARTUP_DELAY=5
    
    echo "=== Starting services (external DB) ==="
    echo "DATABASE_URL: [external]"
    echo "GOTRUE_SITE_URL: $GOTRUE_SITE_URL"
    echo "Self-hosted mode: Auth available at /auth"
else
    # Using self-contained PostgreSQL
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
    export GOTRUE_DB_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"
    
    # Enable local PostgreSQL in supervisord, longer startup delays
    export AUTOSTART_POSTGRES=true
    export GOTRUE_STARTUP_DELAY=5
    export APP_STARTUP_DELAY=10
    
    # Ensure data directory exists with correct permissions
    mkdir -p /data/postgres
    chown -R postgres:postgres /data/postgres

    # Initialize PostgreSQL if needed
    if [ ! -f "/data/postgres/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database..."
        su postgres -c "/usr/lib/postgresql/15/bin/initdb -D /data/postgres"
        
        # Configure PostgreSQL
        echo "host all all 0.0.0.0/0 md5" >> /data/postgres/pg_hba.conf
        echo "host all all 127.0.0.1/32 trust" >> /data/postgres/pg_hba.conf
        echo "local all all trust" >> /data/postgres/pg_hba.conf
        echo "listen_addresses = 'localhost'" >> /data/postgres/postgresql.conf
        
        # Start PostgreSQL temporarily to create user and database
        su postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /data/postgres -w start"
        
        # Set postgres password and create auth schema
        su postgres -c "psql -c \"ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';\""
        su postgres -c "psql -c \"CREATE SCHEMA IF NOT EXISTS auth;\""
        su postgres -c "psql -c \"CREATE EXTENSION IF NOT EXISTS uuid-ossp;\""
        
        # Run Drizzle migrations
        echo "Running database migrations..."
        cd /app && bun run db:push || echo "Migrations may need to run again on next start"
        
        su postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /data/postgres -w stop"
        echo "PostgreSQL initialized"
    else
        echo "PostgreSQL already initialized"
    fi

    # Ensure data directory has correct permissions
    chown -R postgres:postgres /data/postgres

    echo "=== Starting services (self-contained DB) ==="
    echo "DATABASE_URL: postgresql://${POSTGRES_USER}:***@localhost:5432/${POSTGRES_DB}"
    echo "GOTRUE_SITE_URL: $GOTRUE_SITE_URL"
    echo "Self-hosted mode: Auth available at /auth"
fi

exec "$@"
