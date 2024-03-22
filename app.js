const schedule = require("node-schedle");

class TaskScheduler {
  constructor() {
    this.scheduledTasks = [];
  }
  scheduleTask = (cronExpression, taskFunction) => {
    const scheduledTask = schedule.scheduleJob(cronExpression, taskFunction);
    this.scheduleTasks.push(scheduledTask);
    return scheduledTask;
  };

  deleteTask = (task) => {
    task.cancel();
    this.scheduledTasks = this.scheduledTasks.filter(task => tasks !== task )
    
  }

  deleteAllTask = () => {
    this.scheduledTasks.forEach(task => task.cancel())
     this.scheduledTasks = []
  }


}

