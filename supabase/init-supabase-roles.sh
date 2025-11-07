#!/bin/bash
set -e

# Create Supabase-specific roles
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create Supabase system roles
    CREATE ROLE supabase_admin NOLOGIN NOINHERIT;
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT;
    CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT;
    CREATE ROLE supabase_functions_admin NOLOGIN NOINHERIT;
    CREATE ROLE supabase_read_only_user NOLOGIN NOINHERIT;
    
    -- Create authenticator role for PostgREST
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    
    -- Create anon and authenticated roles for RLS
    CREATE ROLE anon NOLOGIN NOINHERIT;
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    
    -- Grant permissions
    GRANT supabase_admin TO postgres;
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    
    -- Grant usage on public schema
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA public TO supabase_admin;
    
    -- Install required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pgjwt";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EOSQL

echo "Supabase roles and extensions created successfully"
