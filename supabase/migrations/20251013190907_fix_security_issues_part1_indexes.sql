/*
  # Fix Security Issues - Part 1: Add Missing Indexes

  1. Indexes Added
    - Add index on admin_permissions.granted_by for foreign key
    - Add index on admin_permissions.permission_id for foreign key
    
  2. Notes
    - These indexes improve query performance for foreign key lookups
    - No data changes, only schema optimization
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by 
  ON admin_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission_id 
  ON admin_permissions(permission_id);
