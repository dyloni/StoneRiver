/*
  # Create Insert Agent Function

  1. New Function
    - `insert_new_agent` - Function to insert agent bypassing RLS
      - Takes agent details as parameters
      - Returns agent data
      - Uses SECURITY DEFINER to bypass RLS
  
  2. Security
    - Function is accessible to anon and authenticated roles
    - Bypasses RLS for insertion only
*/

CREATE OR REPLACE FUNCTION insert_new_agent(
  agent_email TEXT,
  agent_first_name TEXT,
  agent_surname TEXT
)
RETURNS TABLE (
  id INTEGER,
  email TEXT,
  first_name TEXT,
  surname TEXT,
  auth_user_id UUID
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_agent_id INTEGER;
  new_auth_id UUID;
BEGIN
  new_auth_id := gen_random_uuid();
  
  INSERT INTO agents (
    auth_user_id,
    first_name,
    surname,
    email
  ) VALUES (
    new_auth_id,
    agent_first_name,
    agent_surname,
    agent_email
  )
  RETURNING agents.id INTO new_agent_id;

  RETURN QUERY
  SELECT 
    a.id,
    a.email,
    a.first_name,
    a.surname,
    a.auth_user_id
  FROM agents a
  WHERE a.id = new_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_new_agent(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_new_agent(TEXT, TEXT, TEXT) TO authenticated;
