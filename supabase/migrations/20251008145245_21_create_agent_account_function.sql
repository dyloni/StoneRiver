/*
  # Create Agent Account Function

  1. New Function
    - `create_agent_account` - Function to create agent accounts
      - Creates auth user
      - Creates agent record
      - Returns agent data
  
  2. Security
    - Function is accessible to anon and authenticated roles
    - Uses SECURITY DEFINER to bypass RLS for creation
*/

CREATE OR REPLACE FUNCTION create_agent_account(
  agent_email TEXT,
  agent_first_name TEXT,
  agent_surname TEXT,
  agent_password TEXT
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
  new_auth_user_id UUID;
  new_agent_id INTEGER;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    agent_email,
    crypt(agent_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('role', 'agent'),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_auth_user_id;

  INSERT INTO agents (
    auth_user_id,
    first_name,
    surname,
    email
  ) VALUES (
    new_auth_user_id,
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

GRANT EXECUTE ON FUNCTION create_agent_account(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_agent_account(TEXT, TEXT, TEXT, TEXT) TO authenticated;
