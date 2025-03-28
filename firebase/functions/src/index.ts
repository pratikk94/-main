import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export all functions from feature modules
export * from "./auth";
export * from "./tasks";
export * from "./metrics";
