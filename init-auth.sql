-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email_confirmed_at TIMESTAMPTZ
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user profiles/public.users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'supplier')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- Create authenticate_user function
CREATE OR REPLACE FUNCTION public.authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    role TEXT,
    organization_id UUID,
    full_name TEXT
) AS $$
DECLARE
    auth_id UUID;
    password_hash TEXT;
BEGIN
    -- Get auth user and password
    SELECT au.id, au.encrypted_password INTO auth_id, password_hash
    FROM auth.users au
    WHERE au.email = user_email;
    
    IF auth_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Verify password (bcrypt)
    IF password_hash = crypt(user_password, password_hash) THEN
        -- Return user info
        RETURN QUERY
        SELECT u.id, u.email, u.role, u.organization_id, u.full_name
        FROM public.users u
        WHERE u.auth_user_id = auth_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
