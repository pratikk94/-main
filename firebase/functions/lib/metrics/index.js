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
exports.calculateDailyMetrics = exports.calculateWeeklyMetrics = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Checks if the data matches the Task interface
 * @param {unknown} data The data to check
 * @return {boolean} True if the data is a valid Task
 */
function isValidTask(data) {
    if (!data || typeof data !== "object") {
        return false;
    }
    const taskData = data;
    return (typeof taskData.status === "string" &&
        ["completed", "pending", "overdue"].includes(taskData.status) &&
        (!taskData.completedAt || taskData.completedAt instanceof admin.firestore.Timestamp) &&
        taskData.dueDate instanceof admin.firestore.Timestamp);
}
// Calculate weekly performance metrics
exports.calculateWeeklyMetrics = (0, scheduler_1.onSchedule)({
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
                .filter((doc) => {
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
    }
    catch (error) {
        console.error("Error calculating metrics:", error);
    }
});
// Calculate and store daily metrics
exports.calculateDailyMetrics = (0, scheduler_1.onSchedule)({
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
                .filter((doc) => {
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
    }
    catch (error) {
        console.error("Error calculating daily metrics:", error);
    }
});
//# sourceMappingURL=index.js.map