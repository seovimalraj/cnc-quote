-- Drop and recreate authenticate_user function with correct return format
DROP FUNCTION IF EXISTS public.authenticate_user(TEXT, TEXT);

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
