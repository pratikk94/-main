"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserDeleted = exports.handleUserDeletion = exports.onUserCreated = exports.getUserProfile = exports.updateUserRole = exports.createUserAccount = exports.createSuperAdmin = exports.USER_ROLES = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = __importStar(require("../config/firebase"));
const adminFirebase = __importStar(require("firebase-admin"));
// Initialize Firebase Admin if not already initialized
if (!adminFirebase.apps.length) {
    adminFirebase.initializeApp();
}
// Available user roles in order of increasing privileges
exports.USER_ROLES = {
    CLIENT: "client",
    ENGINEER: "engineer",
    FOUNDER: "founder",
    SUPER_ADMIN: "super_admin",
};
// Create initial super admin
exports.createSuperAdmin = functions.region("us-central1").https.onCall(async (data, context) => {
    try {
        const { email, password } = data;
        if (email !== "pratik@destinpq.com") {
            throw new Error("Unauthorized: Only the designated super admin email is allowed");
        }
        // Check if super admin already exists
        const superAdminQuery = await firebase_1.db
            .collection("users")
            .where("role", "==", exports.USER_ROLES.SUPER_ADMIN)
            .get();
        if (!superAdminQuery.empty) {
            throw new Error("Super admin already exists");
        }
        // Create user in Firebase Auth
        const userRecord = await firebase_1.auth.createUser({
            email,
            password,
            emailVerified: true,
        });
        // Create user document in Firestore
        await firebase_1.db.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            role: exports.USER_ROLES.SUPER_ADMIN,
            createdAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
        });
        // Set custom claims
        await firebase_1.auth.setCustomUserClaims(userRecord.uid, {
            role: exports.USER_ROLES.SUPER_ADMIN,
        });
        return { uid: userRecord.uid };
    }
    catch (error) {
        console.error("Error creating super admin:", error);
        throw new Error("Error creating super admin account");
    }
});
exports.createUserAccount = functions.region("us-central1").https.onCall(async (data, context) => {
    var _a;
    try {
        const { email, password } = data;
        if (!email || !password) {
            throw new Error("Email and password are required");
        }
        // Create user in Firebase Auth
        const userRecord = await firebase_1.auth.createUser({
            email,
            password,
        });
        // Create user document in Firestore with default client role
        await firebase_1.db.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            role: exports.USER_ROLES.CLIENT,
            createdAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
            createdBy: (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid,
        });
        // Set custom claims for client role
        await firebase_1.auth.setCustomUserClaims(userRecord.uid, {
            role: exports.USER_ROLES.CLIENT,
        });
        return { uid: userRecord.uid };
    }
    catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Error creating user account");
    }
});
exports.updateUserRole = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new Error("Unauthorized");
    }
    try {
        // Get the current user's role
        const adminDoc = await firebase_1.db
            .collection("users")
            .doc(context.auth.uid)
            .get();
        const adminData = adminDoc.data();
        if (!adminData || adminData.role !== exports.USER_ROLES.SUPER_ADMIN) {
            throw new Error("Only super admin can update user roles");
        }
        const { userId, newRole } = data;
        if (!Object.values(exports.USER_ROLES).includes(newRole)) {
            throw new Error("Invalid role specified");
        }
        // Update user's role in Firestore
        await firebase_1.db.collection("users").doc(userId).update({
            role: newRole,
            updatedAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
        });
        // Update custom claims
        await firebase_1.auth.setCustomUserClaims(userId, { role: newRole });
        return { success: true };
    }
    catch (error) {
        console.error("Error updating user role:", error);
        throw new Error("Error updating user role");
    }
});
exports.getUserProfile = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new Error("User must be authenticated");
    }
    try {
        const userDoc = await firebase_1.db
            .collection("users")
            .doc(context.auth.uid)
            .get();
        if (!userDoc.exists) {
            throw new Error("User profile not found");
        }
        const userData = userDoc.data();
        return Object.assign(Object.assign({}, userData), { uid: context.auth.uid });
    }
    catch (error) {
        console.error("Error getting user profile:", error);
        throw new Error("Error retrieving user profile");
    }
});
exports.onUserCreated = functions.region("us-central1").firestore
    .document("users/{userId}")
    .onCreate(async (snap, context) => {
    try {
        const userId = context.params.userId;
        const userData = snap.data();
        // Create initial settings for the user
        await firebase_1.db.collection("userSettings").doc(userId).set({
            emailNotifications: true,
            theme: "light",
            createdAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
            role: userData.role,
        });
        console.log(`Created settings for user ${userId}`);
        return { success: true };
    }
    catch (error) {
        console.error("Error creating user settings:", error);
        return { success: false, error: String(error) };
    }
});
// Handle user deletion
exports.handleUserDeletion = functions.region("us-central1").firestore
    .document("users/{userId}")
    .onDelete(async (snap, context) => {
    try {
        const userId = context.params.userId;
        // Delete user's auth account
        await firebase_1.auth.deleteUser(userId);
        // Delete user's settings
        await firebase_1.db.collection("userSettings").doc(userId).delete();
        // Delete user's tasks
        const tasksSnapshot = await firebase_1.db
            .collection("tasks")
            .where("assignedTo", "==", userId)
            .get();
        const deletePromises = tasksSnapshot.docs.map((doc) => doc.ref.delete());
        await Promise.all(deletePromises);
        console.log(`Cleaned up data for deleted user ${userId}`);
        return { success: true };
    }
    catch (error) {
        console.error("Error cleaning up deleted user data:", error);
        return { success: false, error: String(error) };
    }
});
exports.onUserDeleted = functions.region("us-central1").firestore
    .document("users/{userId}")
    .onDelete(async (snap, context) => {
    try {
        const userId = context.params.userId;
        // Delete user settings
        await firebase_1.db.collection("userSettings").doc(userId).delete();
        // Delete user from Firebase Auth
        await firebase_1.auth.deleteUser(userId);
        return { success: true };
    }
    catch (error) {
        console.error("Error handling user deletion:", error);
        throw new Error("Error handling user deletion");
    }
});
// Export all functions by feature
//# sourceMappingURL=index.js.map