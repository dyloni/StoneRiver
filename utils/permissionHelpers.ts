import { supabase } from './supabase';

export interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export interface AdminPermission {
  admin_id: number;
  permission_id: number;
  granted_at: string;
  granted_by: number | null;
}

export interface AuditLogEntry {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('is_super_admin')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.is_super_admin === true;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    const superAdmin = await isSuperAdmin(userId);
    if (superAdmin) {
      return true;
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!admin) {
      return false;
    }

    const { data: adminPermissions } = await supabase
      .from('admin_permissions')
      .select(`
        permission_id,
        permissions (
          name
        )
      `)
      .eq('admin_id', admin.id);

    if (!adminPermissions) {
      return false;
    }

    return adminPermissions.some(
      (ap: any) => ap.permissions && ap.permissions.name === permissionName
    );
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    const superAdmin = await isSuperAdmin(userId);
    if (superAdmin) {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!admin) {
      return [];
    }

    const { data: adminPermissions, error } = await supabase
      .from('admin_permissions')
      .select(`
        permissions (
          id,
          name,
          description,
          category,
          created_at
        )
      `)
      .eq('admin_id', admin.id);

    if (error) throw error;

    return (adminPermissions || [])
      .map((ap: any) => ap.permissions)
      .filter(Boolean);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    return [];
  }
}

export async function grantPermission(
  adminId: number,
  permissionId: number,
  grantedBy: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_permissions')
      .insert({
        admin_id: adminId,
        permission_id: permissionId,
        granted_by: grantedBy,
      });

    if (error) {
      console.error('Error granting permission:', error);
      return false;
    }

    await logAdminAction(
      grantedBy,
      'grant_permission',
      'permission',
      permissionId.toString(),
      { admin_id: adminId, permission_id: permissionId }
    );

    return true;
  } catch (error) {
    console.error('Error granting permission:', error);
    return false;
  }
}

export async function revokePermission(
  adminId: number,
  permissionId: number,
  revokedBy: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('admin_id', adminId)
      .eq('permission_id', permissionId);

    if (error) {
      console.error('Error revoking permission:', error);
      return false;
    }

    await logAdminAction(
      revokedBy,
      'revoke_permission',
      'permission',
      permissionId.toString(),
      { admin_id: adminId, permission_id: permissionId }
    );

    return true;
  } catch (error) {
    console.error('Error revoking permission:', error);
    return false;
  }
}

export async function logAdminAction(
  adminId: number,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId || null,
        details: details || null,
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

export async function getAuditLogs(
  filters?: {
    adminId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AuditLogEntry[]> {
  try {
    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

export const PERMISSION_NAMES = {
  SYSTEM: {
    READ_ALL_DATA: 'system.read_all_data',
    WRITE_ALL_DATA: 'system.write_all_data',
    MODIFY_SETTINGS: 'system.modify_settings',
    VIEW_AUDIT_LOGS: 'system.view_audit_logs',
  },
  AGENT: {
    CREATE: 'agent.create',
    READ: 'agent.read',
    UPDATE: 'agent.update',
    DELETE: 'agent.delete',
    RESET_PASSWORD: 'agent.reset_password',
    ASSIGN_CUSTOMERS: 'agent.assign_customers',
  },
  ADMIN: {
    CREATE: 'admin.create',
    READ: 'admin.read',
    UPDATE: 'admin.update',
    DELETE: 'admin.delete',
    MANAGE_ROLES: 'admin.manage_roles',
    MANAGE_PERMISSIONS: 'admin.manage_permissions',
  },
  POLICY: {
    CREATE: 'policy.create',
    READ: 'policy.read',
    UPDATE: 'policy.update',
    DELETE: 'policy.delete',
  },
  CUSTOMER_POLICY: {
    CREATE: 'customer_policy.create',
    READ: 'customer_policy.read',
    UPDATE: 'customer_policy.update',
    DELETE: 'customer_policy.delete',
  },
  CUSTOMER: {
    CREATE: 'customer.create',
    READ: 'customer.read',
    UPDATE: 'customer.update',
    DELETE: 'customer.delete',
    BULK_IMPORT: 'customer.bulk_import',
  },
  REQUEST: {
    APPROVE: 'request.approve',
    REJECT: 'request.reject',
    READ: 'request.read',
  },
  CLAIM: {
    APPROVE: 'claim.approve',
    REJECT: 'claim.reject',
    PROCESS_PAYMENT: 'claim.process_payment',
    READ: 'claim.read',
  },
  PAYMENT: {
    CREATE: 'payment.create',
    READ: 'payment.read',
    UPDATE: 'payment.update',
    DELETE: 'payment.delete',
  },
  REMINDER: {
    CONFIGURE: 'reminder.configure',
    SEND: 'reminder.send',
    VIEW_LOGS: 'reminder.view_logs',
  },
  MESSAGE: {
    BROADCAST: 'message.broadcast',
    READ_ALL: 'message.read_all',
  },
};
