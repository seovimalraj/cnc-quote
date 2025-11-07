-- =====================================================
-- Create password authentication function
-- Validates user credentials against auth.users table
-- =====================================================

CREATE OR REPLACE FUNCTION authenticate_user(
  user_email text,
  user_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user auth.users;
  is_valid boolean;
BEGIN
  -- Find user by email
  SELECT * INTO auth_user
  FROM auth.users
  WHERE email = user_email
  AND confirmed_at IS NOT NULL
  LIMIT 1;

  -- User not found
  IF NOT FOUND THEN
    RETURN json_build_object('user_id', null, 'valid', false);
  END IF;

  -- Verify password using crypt
  SELECT (auth_user.encrypted_password = crypt(user_password, auth_user.encrypted_password))
  INTO is_valid;

  -- Return result
  IF is_valid THEN
    RETURN json_build_object(
      'user_id', auth_user.id,
      'valid', true,
      'email', auth_user.email
    );
  ELSE
    RETURN json_build_object('user_id', null, 'valid', false);
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO postgres;
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO authenticated;

SELECT 'Password authentication function created' as status;
