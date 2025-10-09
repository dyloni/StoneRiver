/*
  # Enable Real-time for Agents Table

  1. Changes
    - Enable real-time updates for the agents table
    - This allows the app to receive instant notifications when agents are created/updated
*/

ALTER PUBLICATION supabase_realtime ADD TABLE agents;
