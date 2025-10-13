/*
  # Fix Security Issues - Part 6: Fix Function Search Paths

  1. Changes
    - Set immutable search_path for security-sensitive functions
    - Prevents search_path manipulation attacks
    
  2. Functions Fixed
    - normalize_policy_number
    - log_admin_action
    - is_super_admin
    - has_permission
    - grant_super_admin_permissions
*/

-- Fix normalize_policy_number function
DROP FUNCTION IF EXISTS normalize_policy_number(TEXT);
CREATE OR REPLACE FUNCTION normalize_policy_number(policy_num TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN UPPER(TRIM(policy_num));
END;
$$;

-- Fix log_admin_action function
DROP FUNCTION IF EXISTS log_admin_action(INTEGER, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id INTEGER,
  p_action TEXT,
  p_target_table TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_table, details)
  VALUES (p_admin_id, p_action, p_target_table, p_details);
END;
$$;

-- Fix is_super_admin function
DROP FUNCTION IF EXISTS is_super_admin();
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE auth_user_id = auth.uid() 
    AND is_super_admin = true
  );
END;
$$;

-- Fix has_permission function
DROP FUNCTION IF EXISTS has_permission(TEXT);
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_permissions ap
    JOIN admins a ON ap.admin_id = a.id
    JOIN permissions p ON ap.permission_id = p.id
    WHERE a.auth_user_id = auth.uid()
    AND p.name = permission_name
    AND ap.is_active = true
  );
END;
$$;

-- Fix grant_super_admin_permissions function
DROP FUNCTION IF EXISTS grant_super_admin_permissions(INTEGER);
CREATE OR REPLACE FUNCTION grant_super_admin_permissions(admin_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  perm_id INTEGER;
BEGIN
  FOR perm_id IN SELECT id FROM permissions
  LOOP
    INSERT INTO admin_permissions (admin_id, permission_id, granted_by)
    VALUES (admin_id, perm_id, admin_id)
    ON CONFLICT (admin_id, permission_id) DO NOTHING;
  END LOOP;
END;
$$;
