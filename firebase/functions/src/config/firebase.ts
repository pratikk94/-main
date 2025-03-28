import * as admin from "firebase-admin";

// Initialize Firebase Admin only if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;
