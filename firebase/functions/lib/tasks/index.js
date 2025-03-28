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
exports.checkOverdueTasks = exports.sendTaskReminder = void 0;
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
    const validStatus = ["pending", "completed", "overdue"];
    return (typeof taskData.title === "string" &&
        taskData.dueDate instanceof admin.firestore.Timestamp &&
        typeof taskData.status === "string" &&
        validStatus.includes(taskData.status) &&
        typeof taskData.assignedTo === "string");
}
/**
 * Checks if the data matches the User interface
 * @param {unknown} data The data to check
 * @return {boolean} True if the data is a valid User
 */
function isValidUser(data) {
    if (!data || typeof data !== "object") {
        return false;
    }
    const userData = data;
    const validRoles = ["admin", "member"];
    return (typeof userData.email === "string" &&
        typeof userData.role === "string" &&
        validRoles.includes(userData.role));
}
// Send email reminder for tasks
exports.sendTaskReminder = (0, scheduler_1.onSchedule)({
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
        const validResults = results.filter((result) => result !== null);
        console.log(`Processed ${validResults.length} reminders`);
    }
    catch (error) {
        console.error("Error sending reminders:", error);
    }
});
// Update task status when overdue
exports.checkOverdueTasks = (0, scheduler_1.onSchedule)({
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
    }
    catch (error) {
        console.error("Error updating overdue tasks:", error);
    }
});
//# sourceMappingURL=index.js.map