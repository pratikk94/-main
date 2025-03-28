import * as functions from "firebase-functions";
import admin, { db, auth } from "../config/firebase";
import * as adminFirebase from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!adminFirebase.apps.length) {
  adminFirebase.initializeApp();
}

// Available user roles in order of increasing privileges
export const USER_ROLES = {
  CLIENT: "client",
  ENGINEER: "engineer",
  FOUNDER: "founder",
  SUPER_ADMIN: "super_admin",
} as const;

type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

interface UserData {
  email: string;
  role: UserRole;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  createdBy?: string;
}

interface CreateUserData {
  email: string;
  password: string;
}

interface UpdateRoleData {
  userId: string;
  newRole: UserRole;
}

// Create initial super admin
export const createSuperAdmin = functions.region("us-central1").https.onCall(async (data: CreateUserData, context) => {
  try {
    const { email, password } = data;

    if (email !== "pratik@destinpq.com") {
      throw new Error("Unauthorized: Only the designated super admin email is allowed");
    }

    // Check if super admin already exists
    const superAdminQuery = await db
      .collection("users")
      .where("role", "==", USER_ROLES.SUPER_ADMIN)
      .get();

    if (!superAdminQuery.empty) {
      throw new Error("Super admin already exists");
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
    });

    // Create user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      role: USER_ROLES.SUPER_ADMIN,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: USER_ROLES.SUPER_ADMIN,
    });

    return { uid: userRecord.uid };
  } catch (error) {
    console.error("Error creating super admin:", error);
    throw new Error("Error creating super admin account");
  }
});

export const createUserAccount = functions.region("us-central1").https.onCall(async (data: CreateUserData, context) => {
  try {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
    });

    // Create user document in Firestore with default client role
    await db.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      role: USER_ROLES.CLIENT,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth?.uid,
    });

    // Set custom claims for client role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: USER_ROLES.CLIENT,
    });

    return { uid: userRecord.uid };
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Error creating user account");
  }
});

export const updateUserRole = functions.region("us-central1").https.onCall(async (data: UpdateRoleData, context) => {
  if (!context.auth) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the current user's role
    const adminDoc = await db
      .collection("users")
      .doc(context.auth.uid)
      .get();

    const adminData = adminDoc.data() as UserData;

    if (!adminData || adminData.role !== USER_ROLES.SUPER_ADMIN) {
      throw new Error("Only super admin can update user roles");
    }

    const { userId, newRole } = data;

    if (!Object.values(USER_ROLES).includes(newRole)) {
      throw new Error("Invalid role specified");
    }

    // Update user's role in Firestore
    await db.collection("users").doc(userId).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update custom claims
    await auth.setCustomUserClaims(
      userId,
      { role: newRole },
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Error updating user role");
  }
});

export const getUserProfile = functions.region("us-central1").https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new Error("User must be authenticated");
  }

  try {
    const userDoc = await db
      .collection("users")
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists) {
      throw new Error("User profile not found");
    }

    const userData = userDoc.data() as UserData;
    return {
      ...userData,
      uid: context.auth.uid,
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw new Error("Error retrieving user profile");
  }
});

export const onUserCreated = functions.region("us-central1").firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    try {
      const userId = context.params.userId;
      const userData = snap.data() as UserData;

      // Create initial settings for the user
      await db.collection("userSettings").doc(userId).set({
        emailNotifications: true,
        theme: "light",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: userData.role,
      });

      console.log(`Created settings for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error("Error creating user settings:", error);
      return { success: false, error: String(error) };
    }
  });

// Handle user deletion
export const handleUserDeletion = functions.region("us-central1").firestore
  .document("users/{userId}")
  .onDelete(async (snap, context) => {
    try {
      const userId = context.params.userId;

      // Delete user's auth account
      await auth.deleteUser(userId);

      // Delete user's settings
      await db.collection("userSettings").doc(userId).delete();

      // Delete user's tasks
      const tasksSnapshot = await db
        .collection("tasks")
        .where("assignedTo", "==", userId)
        .get();

      const deletePromises = tasksSnapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletePromises);

      console.log(`Cleaned up data for deleted user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error("Error cleaning up deleted user data:", error);
      return { success: false, error: String(error) };
    }
  });

export const onUserDeleted = functions.region("us-central1").firestore
  .document("users/{userId}")
  .onDelete(async (snap, context) => {
    try {
      const userId = context.params.userId;

      // Delete user settings
      await db.collection("userSettings").doc(userId).delete();

      // Delete user from Firebase Auth
      await auth.deleteUser(userId);

      return { success: true };
    } catch (error) {
      console.error("Error handling user deletion:", error);
      throw new Error("Error handling user deletion");
    }
  });

// Export all functions by feature
