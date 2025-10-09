/*
  # Simplified Agent Creation

  1. Changes
    - Drop the complex create_agent_account function
    - Create a simpler function that just inserts agent records
    - Agent creation will be handled client-side with proper auth
  
  2. New Function
    - `insert_agent_record` - Simple function to insert agent after auth is created
*/

DROP FUNCTION IF EXISTS create_agent_account(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION insert_agent_record(
  auth_id UUID,
  agent_email TEXT,
  agent_first_name TEXT,
  agent_surname TEXT
)
RETURNS TABLE (
  id INTEGER,
  email TEXT,
  first_name TEXT,
  surname TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_agent_id INTEGER;
BEGIN
  INSERT INTO agents (
    auth_user_id,
    first_name,
    surname,
    email
  ) VALUES (
    auth_id,
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
    a.surname
  FROM agents a
  WHERE a.id = new_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_agent_record(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_agent_record(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_agent_record(UUID, TEXT, TEXT, TEXT) TO service_role;
