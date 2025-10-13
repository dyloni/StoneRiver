/*
  # Fix Messages Table ID Column
  
  1. Changes
    - Add sequence for messages.id to enable auto-increment
    - Set id column default to use the sequence
    
  2. Notes
    - This ensures messages can be inserted without manually providing an ID
    - The ID will auto-increment properly
*/

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'messages_id_seq') THEN
    CREATE SEQUENCE messages_id_seq;
    ALTER TABLE messages ALTER COLUMN id SET DEFAULT nextval('messages_id_seq');
    PERFORM setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 0) + 1, false);
  END IF;
END $$;