# TaskWarp

TaskWarp is a small Node.js cron scheduler with a clean web dashboard. Schedule recurring jobs, see what is coming up, and review recent runs.

## Run the dashboard

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to change the port. Tasks are held in memory and run only while the Node.js process is online; they are cleared when it restarts. Dashboard-created jobs record a successful scheduled run in the activity feed (they do not execute arbitrary user-supplied code).

## Use as a module

```js
const TaskScheduler = require('task-warp');

const scheduler = new TaskScheduler();
const job = scheduler.scheduleTask('*/5 * * * *', () => {
  console.log('Task executed at:', new Date());
}, { name: 'Five-minute check' });

// Cancel an individual job by its job object or the supplied id.
scheduler.deleteTask(job);
// Or cancel everything at once.
scheduler.deleteAllTasks();
```

Cron expressions use the server's local timezone and are interpreted by [node-schedule](https://github.com/node-schedule/node-schedule). You can inspect scheduled work with `scheduler.getTasks()`.

## HTTP API

- `GET /api/tasks` — list scheduled tasks and recent runs.
- `POST /api/tasks` — create a task with JSON `{ "name": "Daily report", "cronExpression": "0 9 * * 1-5" }`.
- `DELETE /api/tasks/:id` — cancel one task.
- `DELETE /api/tasks` — cancel all tasks.

## Development

```bash
npm test
npm start
```
