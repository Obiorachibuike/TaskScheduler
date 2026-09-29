const test = require("node:test");
const assert = require("node:assert/strict");
const TaskScheduler = require("../app");

test("schedules, lists, and deletes a task", () => {
  const scheduler = new TaskScheduler();
  const job = scheduler.scheduleTask("* * * * *", () => {}, { id: "sample", name: "Sample task" });
  assert.equal(scheduler.scheduledTasks.length, 1);
  assert.deepEqual(scheduler.getTasks().map(({ id, name, cronExpression }) => ({ id, name, cronExpression })), [
    { id: "sample", name: "Sample task", cronExpression: "* * * * *" },
  ]);
  assert.equal(scheduler.deleteTask(job), true);
  assert.equal(scheduler.getTasks().length, 0);
  assert.equal(scheduler.deleteTask("sample"), false);
});

test("supports deleting a task by id and clearing every task", () => {
  const scheduler = new TaskScheduler();
  scheduler.scheduleTask("* * * * *", () => {}, { id: "first" });
  scheduler.scheduleTask("*/2 * * * *", () => {}, { id: "second" });
  assert.throws(() => scheduler.scheduleTask("*/3 * * * *", () => {}, { id: "first" }), /unique string/);
  assert.equal(scheduler.deleteTask("first"), true);
  assert.equal(scheduler.getTasks().length, 1);
  scheduler.deleteAllTasks();
  assert.equal(scheduler.getTasks().length, 0);
  assert.equal(scheduler.scheduledTasks.length, 0);
});

test("validates inputs and invalid cron expressions", () => {
  const scheduler = new TaskScheduler();
  assert.throws(() => scheduler.scheduleTask("* * * * *", "not a function"), /taskFunction must be a function/);
  assert.throws(() => scheduler.scheduleTask("", () => {}), /cron expression is required/);
  assert.throws(() => scheduler.scheduleTask("not cron", () => {}), /Invalid or unsupported cron expression/);
  assert.equal(scheduler.getTasks().length, 0);
});
