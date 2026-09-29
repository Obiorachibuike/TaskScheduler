const schedule = require("node-schedule");
const { randomUUID } = require("node:crypto");

/**
 * In-memory cron task manager backed by node-schedule.
 * Tasks run in the current Node.js process and are not persisted across restarts.
 */
class TaskScheduler {
  constructor() {
    this.scheduledTasks = [];
    this.tasksById = new Map();
  }

  scheduleTask(cronExpression, taskFunction, metadata = {}) {
    if (typeof cronExpression !== "string" || cronExpression.trim() === "") {
      throw new TypeError("A cron expression is required.");
    }
    if (typeof taskFunction !== "function") {
      throw new TypeError("taskFunction must be a function.");
    }

    const id = metadata.id || randomUUID();
    if (typeof id !== "string" || this.tasksById.has(id)) {
      throw new Error("Task id must be a unique string.");
    }

    const job = schedule.scheduleJob(cronExpression.trim(), taskFunction);
    if (!job) {
      throw new Error(`Invalid or unsupported cron expression: ${cronExpression}`);
    }

    const record = {
      id,
      name: metadata.name || "Untitled task",
      cronExpression: cronExpression.trim(),
      job,
    };
    this.scheduledTasks.push(job);
    this.tasksById.set(record.id, record);
    job.on("canceled", () => this.removeRecord(record.id));
    return job;
  }

  getTasks() {
    return Array.from(this.tasksById.values(), ({ id, name, cronExpression, job }) => ({
      id,
      name,
      cronExpression,
      nextRun: job.nextInvocation()?.toISOString() ?? null,
    }));
  }

  deleteTask(taskOrId) {
    const record = typeof taskOrId === "string"
      ? this.tasksById.get(taskOrId)
      : Array.from(this.tasksById.values()).find(({ job }) => job === taskOrId);
    if (!record) return false;

    record.job.cancel();
    this.removeRecord(record.id);
    return true;
  }

  deleteAllTasks() {
    for (const { job } of this.tasksById.values()) job.cancel();
    this.tasksById.clear();
    this.scheduledTasks = [];
  }

  // Keep the original singular method available for existing consumers.
  deleteAllTask() {
    this.deleteAllTasks();
  }

  removeRecord(id) {
    const record = this.tasksById.get(id);
    if (!record) return;
    this.tasksById.delete(id);
    this.scheduledTasks = this.scheduledTasks.filter((job) => job !== record.job);
  }
}

module.exports = TaskScheduler;
