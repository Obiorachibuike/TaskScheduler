Sure, here's a simple README file for your `TaskScheduler` class:

---

# TaskScheduler

TaskScheduler is a simple Node.js class that helps you schedule tasks using cron expressions.

## Installation


```
npm install node-schedule
```

## Usage

```javascript
const TaskScheduler = require('./TaskScheduler');

// Create a new instance of TaskScheduler
const scheduler = new TaskScheduler();

// Schedule a task
const scheduledTask = scheduler.scheduleTask('0 * * * *', () => {
  console.log('This task runs every hour.');
});

// Delete a task
scheduler.deleteTask(scheduledTask);

// Delete all tasks
scheduler.deleteAllTask();
```

## API

### `scheduleTask(cronExpression, taskFunction)`

Schedules a task to run according to the provided cron expression. `taskFunction` is the function to be executed when the task runs. Returns the scheduled task object.

### `deleteTask(task)`

Cancels and removes the specified task from the scheduler.

### `deleteAllTask()`

Cancels and removes all tasks from the scheduler.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

