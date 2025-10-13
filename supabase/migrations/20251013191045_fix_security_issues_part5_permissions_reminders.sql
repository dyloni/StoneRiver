/*
  # Fix Security Issues - Part 5: Optimize Permissions and Reminders RLS

  1. Changes
    - Optimize permissions table RLS policies
    - Optimize admin_permissions table RLS policies
    - Optimize reminder tables RLS policies
    - Replace auth.uid() with (SELECT auth.uid())
    
  2. Security
    - Maintains existing access control
    - Performance optimization only
*/

-- Optimize permissions policies
DROP POLICY IF EXISTS "Super admins can insert permissions" ON permissions;
CREATE POLICY "Super admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update permissions" ON permissions;
CREATE POLICY "Super admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can delete permissions" ON permissions;
CREATE POLICY "Super admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize admin_permissions policies
DROP POLICY IF EXISTS "Users can view own permissions" ON admin_permissions;
CREATE POLICY "Users can view own permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all permissions" ON admin_permissions;
CREATE POLICY "Super admins can view all permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can grant permissions" ON admin_permissions;
CREATE POLICY "Super admins can grant permissions"
  ON admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can revoke permissions" ON admin_permissions;
CREATE POLICY "Super admins can revoke permissions"
  ON admin_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize admin_audit_log policies
DROP POLICY IF EXISTS "Super admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Super admins can view audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize claims policies
DROP POLICY IF EXISTS "Super admins have full access to claims" ON claims;
CREATE POLICY "Super admins have full access to claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize payment_reminders policies
DROP POLICY IF EXISTS "Super admins have full access to payment reminders" ON payment_reminders;
CREATE POLICY "Super admins have full access to payment reminders"
  ON payment_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize birthday_reminders policies
DROP POLICY IF EXISTS "Super admins have full access to birthday reminders" ON birthday_reminders;
CREATE POLICY "Super admins have full access to birthday reminders"
  ON birthday_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize reminder_logs policies
DROP POLICY IF EXISTS "Super admins have full access to reminder logs" ON reminder_logs;
CREATE POLICY "Super admins have full access to reminder logs"
  ON reminder_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );
