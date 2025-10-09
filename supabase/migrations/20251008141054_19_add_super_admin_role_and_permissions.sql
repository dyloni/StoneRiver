/*
  # Add SUPER_ADMIN Role and Permissions System

  1. Changes to Tables
    - `admins` table
      - Expand admin_role CHECK constraint to include 'super_admin'
      - Add is_super_admin column for quick identification
    
    - New `permissions` table
      - id (serial, primary key)
      - name (text, unique) - Permission name (e.g., 'can_create_agent')
      - description (text) - Human-readable description
      - category (text) - Group permissions by category
      - created_at (timestamptz)
    
    - New `admin_permissions` junction table
      - admin_id (integer, references admins.id)
      - permission_id (integer, references permissions.id)
      - granted_at (timestamptz)
      - granted_by (integer, references admins.id, nullable)
      - Primary key (admin_id, permission_id)

  2. Security
    - Enable RLS on new tables
    - SUPER_ADMIN has full CRUD access to all tables
    - SUPER_ADMIN can manage all agents and admins
    - SUPER_ADMIN can create, adjust, and remove policies
    - Other admins can only read permissions
    - Add audit logging for permission changes

  3. Initial Permissions Setup
    - Create comprehensive permission set
    - System Management permissions
    - Agent Management permissions
    - Policy Management permissions
    - Data Access permissions
    - Audit permissions

  4. Important Notes
    - SUPER_ADMIN role must be created via secure setup script
    - MFA should be enforced at application level for SUPER_ADMIN
    - Audit trails maintained for all SUPER_ADMIN actions
*/

-- Step 1: Alter admins table to support super_admin role
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_admin_role_check;
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

ALTER TABLE admins 
  ADD CONSTRAINT admins_admin_role_check 
  CHECK (admin_role IN ('overview', 'sales', 'agents', 'tech', 'super_admin'));

ALTER TABLE admins 
  ADD CONSTRAINT admins_role_check 
  CHECK (role IN ('overview', 'sales', 'agents', 'tech', 'super_admin'));

-- Add convenience column for quick super admin checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admins' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE admins ADD COLUMN is_super_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index on is_super_admin for fast lookups
CREATE INDEX IF NOT EXISTS idx_admins_is_super_admin ON admins(is_super_admin) WHERE is_super_admin = true;

-- Step 2: Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create admin_permissions junction table
CREATE TABLE IF NOT EXISTS admin_permissions (
  admin_id integer NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  permission_id integer NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by integer REFERENCES admins(id) ON DELETE SET NULL,
  PRIMARY KEY (admin_id, permission_id)
);

-- Enable RLS on admin_permissions
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create audit log table for SUPER_ADMIN actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id serial PRIMARY KEY,
  admin_id integer NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- Step 5: Insert comprehensive permission set
INSERT INTO permissions (name, description, category) VALUES
  -- System Management
  ('system.read_all_data', 'Full read access to all system data', 'System Management'),
  ('system.write_all_data', 'Full write access to all system data', 'System Management'),
  ('system.modify_settings', 'Modify global system settings and configurations', 'System Management'),
  ('system.view_audit_logs', 'View all system and user activity logs', 'System Management'),
  
  -- Agent Management
  ('agent.create', 'Create new agent accounts', 'Agent Management'),
  ('agent.read', 'View agent information', 'Agent Management'),
  ('agent.update', 'Update agent profile and information', 'Agent Management'),
  ('agent.delete', 'Delete or deactivate agent accounts', 'Agent Management'),
  ('agent.reset_password', 'Reset agent passwords', 'Agent Management'),
  ('agent.assign_customers', 'Assign customers to agents', 'Agent Management'),
  
  -- Admin Management
  ('admin.create', 'Create new admin accounts', 'Admin Management'),
  ('admin.read', 'View admin information', 'Admin Management'),
  ('admin.update', 'Update admin profiles', 'Admin Management'),
  ('admin.delete', 'Delete or deactivate admin accounts', 'Admin Management'),
  ('admin.manage_roles', 'Assign and modify admin roles', 'Admin Management'),
  ('admin.manage_permissions', 'Grant or revoke permissions', 'Admin Management'),
  
  -- Policy Management (Business Rules)
  ('policy.create', 'Create new business policies and rules', 'Policy Management'),
  ('policy.read', 'View business policies', 'Policy Management'),
  ('policy.update', 'Modify existing policies', 'Policy Management'),
  ('policy.delete', 'Remove policies', 'Policy Management'),
  
  -- Customer Policy Management (Insurance Policies)
  ('customer_policy.create', 'Create new customer insurance policies', 'Customer Management'),
  ('customer_policy.read', 'View customer policies', 'Customer Management'),
  ('customer_policy.update', 'Update customer policies', 'Customer Management'),
  ('customer_policy.delete', 'Delete customer policies', 'Customer Management'),
  
  -- Customer Management
  ('customer.create', 'Create new customers', 'Customer Management'),
  ('customer.read', 'View customer information', 'Customer Management'),
  ('customer.update', 'Update customer details', 'Customer Management'),
  ('customer.delete', 'Delete customers', 'Customer Management'),
  ('customer.bulk_import', 'Import customers in bulk', 'Customer Management'),
  
  -- Request Management
  ('request.approve', 'Approve agent requests', 'Request Management'),
  ('request.reject', 'Reject agent requests', 'Request Management'),
  ('request.read', 'View all requests', 'Request Management'),
  
  -- Claim Management
  ('claim.approve', 'Approve claims', 'Claim Management'),
  ('claim.reject', 'Reject claims', 'Claim Management'),
  ('claim.process_payment', 'Process claim payments', 'Claim Management'),
  ('claim.read', 'View all claims', 'Claim Management'),
  
  -- Payment Management
  ('payment.create', 'Record new payments', 'Payment Management'),
  ('payment.read', 'View payment records', 'Payment Management'),
  ('payment.update', 'Modify payment records', 'Payment Management'),
  ('payment.delete', 'Delete payment records', 'Payment Management'),
  
  -- Reminder Management
  ('reminder.configure', 'Configure automatic reminders', 'Reminder Management'),
  ('reminder.send', 'Send manual reminders', 'Reminder Management'),
  ('reminder.view_logs', 'View reminder logs', 'Reminder Management'),
  
  -- Messaging
  ('message.broadcast', 'Send broadcast messages', 'Messaging'),
  ('message.read_all', 'Read all messages in system', 'Messaging')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE auth_user_id = user_id
    AND is_super_admin = true
  );
$$;

-- Step 7: Create RLS policies for permissions table
CREATE POLICY "Authenticated users can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read permissions"
  ON permissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Super admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Step 8: Create RLS policies for admin_permissions table
CREATE POLICY "Users can view own permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can grant permissions"
  ON admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can revoke permissions"
  ON admin_permissions FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anon can view admin permissions"
  ON admin_permissions FOR SELECT
  TO anon
  USING (true);

-- Step 9: Create RLS policies for audit log
CREATE POLICY "Super admins can view audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert audit logs"
  ON admin_audit_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 10: Update admins table RLS to allow SUPER_ADMIN full access
CREATE POLICY "Super admins can create admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any admin"
  ON admins FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admins"
  ON admins FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Step 11: Update agents table RLS to allow SUPER_ADMIN full access
CREATE POLICY "Super admins can create agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any agent"
  ON agents FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Step 12: Grant SUPER_ADMIN access to all other tables
CREATE POLICY "Super admins have full access to customers"
  ON customers FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to requests"
  ON requests FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to claims"
  ON claims FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to messages"
  ON messages FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to payment reminders"
  ON payment_reminders FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to birthday reminders"
  ON birthday_reminders FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins have full access to reminder logs"
  ON reminder_logs FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Step 13: Create helper function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins a
    JOIN admin_permissions ap ON a.id = ap.admin_id
    JOIN permissions p ON ap.permission_id = p.id
    WHERE a.auth_user_id = user_id
    AND p.name = permission_name
  ) OR is_super_admin(user_id);
$$;

-- Step 14: Create function to grant all permissions to super admin
CREATE OR REPLACE FUNCTION grant_super_admin_permissions(admin_id_param integer, granted_by_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_permissions (admin_id, permission_id, granted_by)
  SELECT admin_id_param, id, granted_by_param
  FROM permissions
  ON CONFLICT (admin_id, permission_id) DO NOTHING;
  
  UPDATE admins
  SET is_super_admin = true,
      admin_role = 'super_admin',
      role = 'super_admin'
  WHERE id = admin_id_param;
END;
$$;

-- Step 15: Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_id_param integer,
  action_param text,
  target_type_param text,
  target_id_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (admin_id_param, action_param, target_type_param, target_id_param, details_param);
END;
$$;

-- Step 16: Add comments for documentation
COMMENT ON TABLE permissions IS 'Stores all available system permissions';
COMMENT ON TABLE admin_permissions IS 'Junction table linking admins to their granted permissions';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions, especially SUPER_ADMIN activities';
COMMENT ON COLUMN admins.is_super_admin IS 'Quick flag to identify super admins without joining to permissions';
COMMENT ON FUNCTION is_super_admin IS 'Check if a user has super admin privileges';
COMMENT ON FUNCTION has_permission IS 'Check if a user has a specific permission (super admins always return true)';
COMMENT ON FUNCTION grant_super_admin_permissions IS 'Grant all permissions and super admin status to an admin';
COMMENT ON FUNCTION log_admin_action IS 'Log an admin action for audit trail';
