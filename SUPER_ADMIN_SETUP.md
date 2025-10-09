# SUPER_ADMIN Role Setup Guide

## Overview

The SUPER_ADMIN role is the highest privilege level in the system with complete access to all functionality, data, and configuration settings. This role should be used with extreme caution and only by trusted personnel.

## Key Capabilities

### 1. System Scope & Configuration
- **Full Access**: Read and write access to all data and system modules
- **System Adjustment**: Modify global settings, integrations, and core application configurations
- **Auditing**: Full read access to all system and user activity logs

### 2. Agent Management (User Creation)
- Create new agent accounts
- Update agent profile information and assigned departments
- Reset agent passwords
- Deactivate or permanently remove agent accounts

### 3. Admin Management
- Create new admin accounts with any role
- Modify admin roles and permissions
- Delete or deactivate admin accounts
- Grant and revoke individual permissions

### 4. Policy Management & Adjustment
- Create new business policies and rules
- Modify existing policies
- Remove obsolete policies
- Configure system-wide policy parameters

### 5. Complete Data Access
- Full CRUD operations on all tables:
  - Customers
  - Agents
  - Admins
  - Requests
  - Claims
  - Payments
  - Messages
  - Reminders
  - All other system data

## Initial Setup

### Step 1: Obtain Supabase Service Role Key

Before creating the SUPER_ADMIN account, you need the Supabase Service Role Key:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Settings** > **API**
3. Copy the **service_role** key (NOT the anon key)
4. Store this key securely - it has full database access

### Step 2: Create the First SUPER_ADMIN Account

Run the setup script with your service role key:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here \
node create-super-admin.js
```

This will:
1. Create an auth user in Supabase Auth
2. Create an admin record in the `admins` table
3. Mark the admin as `is_super_admin = true`
4. Grant all available permissions to the admin
5. Display the login credentials

### Step 3: Secure the Account

**IMMEDIATELY after creation:**

1. **Login** with the provided credentials
2. **Change the password** to a strong, unique password
3. **Enable MFA** (Multi-Factor Authentication) - MANDATORY for SUPER_ADMIN
4. **Store credentials** in a secure password manager
5. **Document** who has SUPER_ADMIN access in your security procedures

### Step 4: Create Additional Admins

Once logged in as SUPER_ADMIN, you can:

1. Create additional admin accounts with specific roles:
   - `overview`: General administrative access
   - `sales`: Sales management
   - `agents`: Agent management
   - `tech`: Technical/system access

2. Grant specific permissions to other admins as needed

## Security Best Practices

### 1. Mandatory MFA
- SUPER_ADMIN accounts MUST have Multi-Factor Authentication enabled
- Use authenticator apps (Google Authenticator, Authy, etc.)
- Never use SMS-based MFA for SUPER_ADMIN accounts

### 2. Strong Password Policy
- Minimum 16 characters
- Include uppercase, lowercase, numbers, and special characters
- Never reuse passwords
- Change passwords every 90 days
- Use a password manager

### 3. Access Control
- Limit SUPER_ADMIN accounts to 1-2 people maximum
- Use principle of least privilege for other admins
- Regular access reviews every quarter
- Immediate revocation upon personnel changes

### 4. Audit Trail
- All SUPER_ADMIN actions are logged in `admin_audit_log` table
- Review audit logs regularly
- Set up alerts for critical actions
- Maintain logs for compliance requirements

### 5. Session Management
- Always logout after administrative tasks
- Use short session timeouts
- Never share sessions or credentials
- Access only from secure, trusted devices

## Using Permission Helpers

The application provides helper functions for permission checking:

```typescript
import {
  isSuperAdmin,
  hasPermission,
  getUserPermissions,
  logAdminAction,
  PERMISSION_NAMES
} from './utils/permissionHelpers';

// Check if user is super admin
const isSuper = await isSuperAdmin(userId);

// Check specific permission
const canCreateAgent = await hasPermission(userId, PERMISSION_NAMES.AGENT.CREATE);

// Get all user permissions
const permissions = await getUserPermissions(userId);

// Log an action
await logAdminAction(
  adminId,
  'create_agent',
  'agent',
  agentId,
  { details: 'Created new agent account' }
);
```

## Permission Categories

### System Management
- `system.read_all_data` - Full read access to all system data
- `system.write_all_data` - Full write access to all system data
- `system.modify_settings` - Modify global system settings
- `system.view_audit_logs` - View all audit logs

### Agent Management
- `agent.create` - Create new agents
- `agent.read` - View agent information
- `agent.update` - Update agent profiles
- `agent.delete` - Delete agents
- `agent.reset_password` - Reset agent passwords
- `agent.assign_customers` - Assign customers to agents

### Admin Management
- `admin.create` - Create new admins
- `admin.read` - View admin information
- `admin.update` - Update admin profiles
- `admin.delete` - Delete admins
- `admin.manage_roles` - Assign and modify roles
- `admin.manage_permissions` - Grant/revoke permissions

### Policy Management
- `policy.create` - Create business policies
- `policy.read` - View policies
- `policy.update` - Modify policies
- `policy.delete` - Remove policies

### Customer Management
- `customer.create` - Create customers
- `customer.read` - View customer data
- `customer.update` - Update customer details
- `customer.delete` - Delete customers
- `customer.bulk_import` - Bulk import customers

### Request Management
- `request.approve` - Approve requests
- `request.reject` - Reject requests
- `request.read` - View all requests

### Claim Management
- `claim.approve` - Approve claims
- `claim.reject` - Reject claims
- `claim.process_payment` - Process claim payments
- `claim.read` - View all claims

### Payment Management
- `payment.create` - Record payments
- `payment.read` - View payments
- `payment.update` - Modify payments
- `payment.delete` - Delete payments

### Reminder Management
- `reminder.configure` - Configure reminders
- `reminder.send` - Send manual reminders
- `reminder.view_logs` - View reminder logs

### Messaging
- `message.broadcast` - Send broadcasts
- `message.read_all` - Read all messages

## Database Functions

The system provides several helper functions:

### `is_super_admin(user_id uuid)`
Returns boolean indicating if the user is a super admin.

```sql
SELECT is_super_admin(auth.uid());
```

### `has_permission(user_id uuid, permission_name text)`
Returns boolean indicating if the user has a specific permission (super admins always return true).

```sql
SELECT has_permission(auth.uid(), 'agent.create');
```

### `grant_super_admin_permissions(admin_id integer, granted_by integer)`
Grants all permissions and super admin status to an admin.

```sql
SELECT grant_super_admin_permissions(5, 1);
```

### `log_admin_action(...)`
Logs an admin action to the audit trail.

```sql
SELECT log_admin_action(
  1, -- admin_id
  'create_agent', -- action
  'agent', -- target_type
  '123', -- target_id
  '{"details": "Created new agent"}'::jsonb -- details
);
```

## Row Level Security (RLS)

SUPER_ADMIN role bypasses most RLS restrictions through special policies:

- All SELECT, INSERT, UPDATE, DELETE operations are allowed on protected tables
- RLS checks use the `is_super_admin()` function for efficient permission checking
- Other admins are restricted by their specific permissions

## Audit Log

All SUPER_ADMIN actions should be logged in the `admin_audit_log` table:

```sql
SELECT
  aal.*,
  a.first_name,
  a.surname,
  a.email
FROM admin_audit_log aal
JOIN admins a ON aal.admin_id = a.id
WHERE a.is_super_admin = true
ORDER BY aal.created_at DESC;
```

## Emergency Access

In case of emergency (e.g., locked out SUPER_ADMIN):

1. Access database directly through Supabase Dashboard
2. Run SQL to create new SUPER_ADMIN:

```sql
-- Find or create auth user first, then:
INSERT INTO admins (auth_user_id, first_name, surname, email, admin_role, role, is_super_admin)
VALUES (
  'auth-user-uuid-here',
  'Emergency',
  'Admin',
  'emergency@stoneriver.com',
  'super_admin',
  'super_admin',
  true
);

-- Grant all permissions
SELECT grant_super_admin_permissions(
  (SELECT id FROM admins WHERE email = 'emergency@stoneriver.com'),
  (SELECT id FROM admins WHERE email = 'emergency@stoneriver.com')
);
```

## Monitoring & Compliance

### Regular Reviews
- Review all SUPER_ADMIN accounts monthly
- Audit permission grants quarterly
- Check audit logs weekly for suspicious activity

### Compliance Requirements
- Maintain audit logs for minimum 2 years
- Document all SUPER_ADMIN access in security procedures
- Report any unauthorized access immediately
- Regular security assessments

### Alert Triggers
Set up alerts for:
- Multiple failed login attempts
- Password changes
- Permission grants/revokes
- Bulk data exports
- Unusual access patterns

## Troubleshooting

### Cannot Login as SUPER_ADMIN
1. Check if account exists in `admins` table
2. Verify `is_super_admin = true`
3. Check auth user in Supabase Auth dashboard
4. Verify email is confirmed

### Permissions Not Working
1. Check if `is_super_admin` flag is set
2. Verify RLS policies are enabled
3. Check `admin_permissions` table for granted permissions
4. Review database function `is_super_admin()`

### Audit Logs Not Recording
1. Check RLS policies on `admin_audit_log`
2. Verify `log_admin_action()` function exists
3. Check application code is calling logging functions
4. Review database logs for errors

## Support

For security concerns or issues with SUPER_ADMIN access:
1. Contact system administrator immediately
2. Review audit logs for suspicious activity
3. Change passwords if compromise suspected
4. Document incident in security log
