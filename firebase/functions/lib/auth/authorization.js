"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPerformAction = exports.getAssignableRoles = exports.hasRole = void 0;
const index_1 = require("./index");
// Role hierarchy from lowest to highest privileges
const roleHierarchy = [
    index_1.USER_ROLES.CLIENT,
    index_1.USER_ROLES.ENGINEER,
    index_1.USER_ROLES.FOUNDER,
    index_1.USER_ROLES.SUPER_ADMIN,
];
/**
 * Check if a role has sufficient privileges
 * @param {UserRole} requiredRole - The minimum role required
 * @param {UserRole} userRole - The user's current role
 * @return {boolean} True if the user has sufficient privileges
 */
function hasRole(requiredRole, userRole) {
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    return userRoleIndex >= requiredRoleIndex;
}
exports.hasRole = hasRole;
/**
 * Get all roles that a user can assign based on their role
 * @param {UserRole} userRole - The user's current role
 * @return {UserRole[]} Array of roles that can be assigned
 */
function getAssignableRoles(userRole) {
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    // Only super admin can assign roles
    if (userRole !== index_1.USER_ROLES.SUPER_ADMIN) {
        return [];
    }
    // Super admin can assign any role except super admin
    return roleHierarchy.filter((_, index) => index < userRoleIndex);
}
exports.getAssignableRoles = getAssignableRoles;
/**
 * Check if a user can perform an action based on their role
 * @param {UserRole} userRole - The user's current role
 * @param {string} action - The action to check
 * @return {boolean} True if the user can perform the action
 */
function canPerformAction(userRole, action) {
    const actionPermissions = {
        "manage_users": [index_1.USER_ROLES.SUPER_ADMIN],
        "view_analytics": [index_1.USER_ROLES.FOUNDER, index_1.USER_ROLES.SUPER_ADMIN],
        "manage_tasks": [index_1.USER_ROLES.ENGINEER, index_1.USER_ROLES.FOUNDER, index_1.USER_ROLES.SUPER_ADMIN],
        "view_tasks": [index_1.USER_ROLES.CLIENT, index_1.USER_ROLES.ENGINEER, index_1.USER_ROLES.FOUNDER, index_1.USER_ROLES.SUPER_ADMIN],
    };
    const allowedRoles = actionPermissions[action];
    if (!allowedRoles) {
        return false;
    }
    return allowedRoles.some((role) => hasRole(role, userRole));
}
exports.canPerformAction = canPerformAction;
//# sourceMappingURL=authorization.js.map