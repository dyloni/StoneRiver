/*
  # Update Login Function with Password Support

  1. Changes
    - Update authenticate_user function to accept password parameter
    - Verify password matches
    - Return requires_password_change flag
    - Check both agents and admins tables
  
  2. Security
    - Password verification happens in database
    - Returns user type (agent or admin)
*/

CREATE OR REPLACE FUNCTION authenticate_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE (
  id INTEGER,
  first_name TEXT,
  surname TEXT,
  email TEXT,
  profile_picture_url TEXT,
  role TEXT,
  is_super_admin BOOLEAN,
  user_type TEXT,
  requires_password_change BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.first_name,
    a.surname,
    a.email,
    a.profile_picture_url,
    a.role,
    a.is_super_admin,
    'admin'::TEXT as user_type,
    a.requires_password_change
  FROM admins a
  WHERE LOWER(a.email) = LOWER(user_email)
    AND a.password = user_password
  
  UNION ALL
  
  SELECT 
    ag.id,
    ag.first_name,
    ag.surname,
    ag.email,
    ag.profile_picture_url,
    NULL::TEXT as role,
    false as is_super_admin,
    'agent'::TEXT as user_type,
    ag.requires_password_change
  FROM agents ag
  WHERE LOWER(ag.email) = LOWER(user_email)
    AND ag.password = user_password;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO authenticated;
