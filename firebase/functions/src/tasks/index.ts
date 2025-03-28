import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface Task {
  title: string;
  dueDate: admin.firestore.Timestamp;
  status: "pending" | "completed" | "overdue";
  assignedTo: string;
  completedAt?: admin.firestore.Timestamp;
}

interface User {
  email: string;
  role: "admin" | "member";
}

/**
 * Checks if the data matches the Task interface
 * @param {unknown} data The data to check
 * @return {boolean} True if the data is a valid Task
 */
function isValidTask(data: unknown): data is Task {
  if (!data || typeof data !== "object") {
    return false;
  }

  const taskData = data as Record<string, unknown>;
  const validStatus = ["pending", "completed", "overdue"];

  return (
    typeof taskData.title === "string" &&
    taskData.dueDate instanceof admin.firestore.Timestamp &&
    typeof taskData.status === "string" &&
    validStatus.includes(taskData.status) &&
    typeof taskData.assignedTo === "string"
  );
}

/**
 * Checks if the data matches the User interface
 * @param {unknown} data The data to check
 * @return {boolean} True if the data is a valid User
 */
function isValidUser(data: unknown): data is User {
  if (!data || typeof data !== "object") {
    return false;
  }

  const userData = data as Record<string, unknown>;
  const validRoles = ["admin", "member"];

  return (
    typeof userData.email === "string" &&
    typeof userData.role === "string" &&
    validRoles.includes(userData.role)
  );
}

// Send email reminder for tasks
export const sendTaskReminder = onSchedule({
  schedule: "every day 09:00",
  timeZone: "America/New_York",
}, async (_event) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Get tasks due tomorrow that are still pending
    const tasksSnapshot = await db.collection("tasks")
      .where("dueDate", "<=", tomorrow)
      .where("status", "==", "pending")
      .get();

    const reminderPromises = tasksSnapshot.docs.map(async (doc) => {
      const taskData = doc.data();
      if (!isValidTask(taskData)) {
        console.error(`Invalid task data for task ${doc.id}`);
        return null;
      }

      const userDoc = await db.collection("users")
        .doc(taskData.assignedTo)
        .get();
      const userData = userDoc.data();
      if (!userData || !isValidUser(userData)) {
        const userId = taskData.assignedTo;
        const msg = `Invalid or missing user data for user ${userId}`;
        console.error(msg);
        return null;
      }

      if (!userData.email) {
        console.error(`No email found for user ${taskData.assignedTo}`);
        return null;
      }

      // Email functionality will be implemented later
      return { taskId: doc.id, userId: taskData.assignedTo };
    });

    const results = await Promise.all(reminderPromises);
    const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
    console.log(`Processed ${validResults.length} reminders`);
  } catch (error) {
    console.error("Error sending reminders:", error);
  }
});

// Update task status when overdue
export const checkOverdueTasks = onSchedule({
  schedule: "every day 00:00",
  timeZone: "America/New_York",
}, async (_event) => {
  const now = admin.firestore.Timestamp.now();

  try {
    const tasksSnapshot = await db.collection("tasks")
      .where("dueDate", "<", now)
      .where("status", "==", "pending")
      .get();

    const updatePromises = tasksSnapshot.docs.map(async (doc) => {
      const taskData = doc.data();
      if (!isValidTask(taskData)) {
        console.error(`Invalid task data for task ${doc.id}`);
        return;
      }
      return doc.ref.update({ status: "overdue" });
    });

    await Promise.all(updatePromises);
    console.log(`Updated ${tasksSnapshot.size} overdue tasks`);
  } catch (error) {
    console.error("Error updating overdue tasks:", error);
  }
});
