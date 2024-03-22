
# task-forge

task-forge is a simple Node.js module for scheduling and managing recurring tasks using the node-schedule library.

## Installation

To install the task-forge module, run the following command:

```bash
npm install task-forge
```

## Usage

```javascript
const TaskScheduler = require('task-forge');

// Create an instance of TaskScheduler
const taskScheduler = new TaskScheduler();

// Schedule a task to run every minute
const scheduledTask = taskScheduler.scheduleTask('* * * * *', () => {
  console.log('Task executed at:', new Date());
});

// Delete a task after 5 minutes
setTimeout(() => {
  taskScheduler.deleteTask(scheduledTask);
  console.log('Task deleted at:', new Date());
}, 5 * 60 * 1000);

// Schedule another task to run every 5 seconds
const anotherScheduledTask = taskScheduler.scheduleTask('*/5 * * * * *', () => {
  console.log('Another task executed at:', new Date());
});

// Delete all tasks after 1 minute
setTimeout(() => {
  taskScheduler.deleteAllTask();
  console.log('All tasks deleted at:', new Date());
}, 1 * 60 * 1000);
```

## Features

- Schedule tasks using cron expressions.
- Delete individual tasks or all tasks at once.
- Easy-to-use API.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```

