/*
  # Update Agent Creation Function with Contact Fields

  1. Changes
    - Drop and recreate the `insert_new_agent` function
    - Add parameters for id_number, phone, street_address, town, postal_address
    - Insert all contact information when creating new agents
    - Set default password and requires_password_change flag

  2. Security
    - Function maintains existing security model
    - Returns new agent record for confirmation
*/

DROP FUNCTION IF EXISTS insert_new_agent(text, text, text);

CREATE OR REPLACE FUNCTION insert_new_agent(
  agent_email TEXT,
  agent_first_name TEXT,
  agent_surname TEXT,
  agent_id_number TEXT DEFAULT '',
  agent_phone TEXT DEFAULT '',
  agent_street_address TEXT DEFAULT '',
  agent_town TEXT DEFAULT '',
  agent_postal_address TEXT DEFAULT ''
)
RETURNS TABLE (
  id INTEGER,
  email TEXT,
  first_name TEXT,
  surname TEXT,
  id_number TEXT,
  phone TEXT,
  street_address TEXT,
  town TEXT,
  postal_address TEXT,
  auth_user_id UUID,
  password TEXT,
  requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_agent_id INTEGER;
  new_auth_id UUID;
  default_password TEXT := 'Stoneriver@#12';
BEGIN
  new_auth_id := gen_random_uuid();

  INSERT INTO agents (
    auth_user_id,
    first_name,
    surname,
    email,
    id_number,
    phone,
    street_address,
    town,
    postal_address,
    password,
    requires_password_change,
    status
  ) VALUES (
    new_auth_id,
    agent_first_name,
    agent_surname,
    agent_email,
    agent_id_number,
    agent_phone,
    agent_street_address,
    agent_town,
    agent_postal_address,
    default_password,
    true,
    'active'
  )
  RETURNING agents.id INTO new_agent_id;

  RETURN QUERY
  SELECT 
    a.id,
    a.email,
    a.first_name,
    a.surname,
    a.id_number,
    a.phone,
    a.street_address,
    a.town,
    a.postal_address,
    a.auth_user_id,
    a.password,
    a.requires_password_change
  FROM agents a
  WHERE a.id = new_agent_id;
END;
$$;
