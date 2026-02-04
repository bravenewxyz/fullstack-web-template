-- Minimal Supabase roles initialization for Auth service
-- This creates the bare minimum for Auth to start and run its own migrations

-- Get password from environment
\set pgpass `echo "$POSTGRES_PASSWORD"`

-- Create base roles (nologin roles for RLS)
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- Create authenticator role for PostgREST
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD :'pgpass';
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Create supabase_auth_admin for Auth service
-- Set search_path to auth schema so Auth can find its tables
CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD :'pgpass';
ALTER ROLE supabase_auth_admin SET search_path TO auth, public;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;

-- Create auth schema for Auth service
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;

-- Grant permissions on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO supabase_auth_admin;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
