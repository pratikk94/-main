import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface Task {
  status: "completed" | "pending" | "overdue";
  completedAt?: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
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
  return (
    typeof taskData.status === "string" &&
    ["completed", "pending", "overdue"].includes(taskData.status) &&
    (!taskData.completedAt || taskData.completedAt instanceof admin.firestore.Timestamp) &&
    taskData.dueDate instanceof admin.firestore.Timestamp
  );
}

// Calculate weekly performance metrics
export const calculateWeeklyMetrics = onSchedule({
  schedule: "every monday 00:00",
  timeZone: "America/New_York",
}, async (_event) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    const usersSnapshot = await db.collection("users").get();

    const metricPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;
      const tasksSnapshot = await db.collection("tasks")
        .where("assignedTo", "==", userId)
        .where("completedAt", ">=", oneWeekAgo)
        .get();

      const validTasks = tasksSnapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .filter((doc): doc is { id: string; data: Task } => {
          if (!isValidTask(doc.data)) {
            console.error(`Invalid task data for task ${doc.id}`);
            return false;
          }
          return true;
        });

      const totalTasks = validTasks.length;
      const completedOnTime = validTasks.filter(({ data: task }) => {
        return task.status === "completed" &&
               task.completedAt && task.completedAt <= task.dueDate;
      }).length;

      return db.collection("performance").add({
        userId,
        week: oneWeekAgo,
        totalTasks,
        completedOnTime,
        completionRate: totalTasks ? completedOnTime / totalTasks : 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(metricPromises);
    console.log("Weekly metrics calculation completed successfully");
  } catch (error) {
    console.error("Error calculating metrics:", error);
  }
});

// Calculate and store daily metrics
export const calculateDailyMetrics = onSchedule({
  schedule: "every day 23:59",
  timeZone: "America/New_York",
}, async (_event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usersSnapshot = await db.collection("users").get();

    const metricPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;
      const tasksSnapshot = await db.collection("tasks")
        .where("assignedTo", "==", userId)
        .where("completedAt", ">=", today)
        .get();

      const validTasks = tasksSnapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .filter((doc): doc is { id: string; data: Task } => {
          if (!isValidTask(doc.data)) {
            console.error(`Invalid task data for task ${doc.id}`);
            return false;
          }
          return true;
        });

      const totalTasks = validTasks.length;
      const completedOnTime = validTasks.filter(({ data: task }) => {
        return task.status === "completed" &&
               task.completedAt && task.completedAt <= task.dueDate;
      }).length;

      return db.collection("dailyMetrics").add({
        userId,
        date: today,
        totalTasks,
        completedOnTime,
        completionRate: totalTasks ? completedOnTime / totalTasks : 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(metricPromises);
    console.log("Daily metrics calculation completed successfully");
  } catch (error) {
    console.error("Error calculating daily metrics:", error);
  }
});
