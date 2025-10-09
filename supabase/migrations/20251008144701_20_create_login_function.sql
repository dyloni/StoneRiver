/*
  # Create Login Function

  1. New Function
    - `authenticate_user` - Function to authenticate users by email
      - Takes email as parameter
      - Returns admin record if found
      - Works around PostgREST schema cache issues
  
  2. Security
    - Function is accessible to anon role
    - Returns sanitized admin data
*/

CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT)
RETURNS TABLE (
  id INTEGER,
  first_name TEXT,
  surname TEXT,
  email TEXT,
  profile_picture_url TEXT,
  role TEXT,
  is_super_admin BOOLEAN
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
    a.is_super_admin
  FROM admins a
  WHERE LOWER(a.email) = LOWER(user_email);
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT) TO authenticated;
