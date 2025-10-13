/*
  # Enable Realtime for Messages and Typing Indicators
  
  1. Changes
    - Enable realtime replication for messages table
    - Enable realtime replication for typing_indicators table
    
  2. Security
    - Tables already have RLS enabled
    - Realtime will respect existing RLS policies
    
  3. Notes
    - This allows instant message delivery and typing indicators
    - Required for real-time chat functionality
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;