import { USER_ROLES } from "./index";

type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role hierarchy from lowest to highest privileges
const roleHierarchy: UserRole[] = [
  USER_ROLES.CLIENT,
  USER_ROLES.ENGINEER,
  USER_ROLES.FOUNDER,
  USER_ROLES.SUPER_ADMIN,
];

/**
 * Check if a role has sufficient privileges
 * @param {UserRole} requiredRole - The minimum role required
 * @param {UserRole} userRole - The user's current role
 * @return {boolean} True if the user has sufficient privileges
 */
export function hasRole(requiredRole: UserRole, userRole: UserRole): boolean {
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Get all roles that a user can assign based on their role
 * @param {UserRole} userRole - The user's current role
 * @return {UserRole[]} Array of roles that can be assigned
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userRoleIndex = roleHierarchy.indexOf(userRole);

  // Only super admin can assign roles
  if (userRole !== USER_ROLES.SUPER_ADMIN) {
    return [];
  }

  // Super admin can assign any role except super admin
  return roleHierarchy.filter((_, index) => index < userRoleIndex);
}

/**
 * Check if a user can perform an action based on their role
 * @param {UserRole} userRole - The user's current role
 * @param {string} action - The action to check
 * @return {boolean} True if the user can perform the action
 */
export function canPerformAction(userRole: UserRole, action: string): boolean {
  const actionPermissions: Record<string, UserRole[]> = {
    "manage_users": [USER_ROLES.SUPER_ADMIN],
    "view_analytics": [USER_ROLES.FOUNDER, USER_ROLES.SUPER_ADMIN],
    "manage_tasks": [USER_ROLES.ENGINEER, USER_ROLES.FOUNDER, USER_ROLES.SUPER_ADMIN],
    "view_tasks": [USER_ROLES.CLIENT, USER_ROLES.ENGINEER, USER_ROLES.FOUNDER, USER_ROLES.SUPER_ADMIN],
  };

  const allowedRoles = actionPermissions[action];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.some((role) => hasRole(role, userRole));
}
