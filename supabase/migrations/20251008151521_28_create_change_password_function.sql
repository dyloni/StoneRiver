/*
  # Create Change Password Function

  1. New Function
    - `change_user_password` - Function to change user password
      - Takes user_id, user_type, and new_password as parameters
      - Updates password and sets requires_password_change to false
      - Returns success status
  
  2. Security
    - Function is accessible to anon and authenticated roles
    - Uses SECURITY DEFINER to bypass RLS
*/

CREATE OR REPLACE FUNCTION change_user_password(
  user_id INTEGER,
  user_type TEXT,
  new_password TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF user_type = 'admin' THEN
    UPDATE admins 
    SET password = new_password, 
        requires_password_change = false
    WHERE id = user_id;
    RETURN FOUND;
  ELSIF user_type = 'agent' THEN
    UPDATE agents 
    SET password = new_password, 
        requires_password_change = false
    WHERE id = user_id;
    RETURN FOUND;
  ELSE
    RETURN false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION change_user_password(INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION change_user_password(INTEGER, TEXT, TEXT) TO authenticated;
