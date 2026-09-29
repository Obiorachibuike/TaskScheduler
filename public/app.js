const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const noResults = document.querySelector("#no-results");
const modalBackdrop = document.querySelector("#modal-backdrop");
const taskForm = document.querySelector("#task-form");
const cronInput = document.querySelector("#cron-expression");
const toast = document.querySelector("#toast");
let tasks = [];
let recentRuns = [];
let toastTimer;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function relativeTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  const milliseconds = date.getTime() - Date.now();
  if (Number.isNaN(milliseconds)) return "—";
  if (milliseconds < 0) return "Due now";
  if (milliseconds < 60_000) return "In less than a minute";
  if (milliseconds < 3_600_000) return `In ${Math.ceil(milliseconds / 60_000)} min`;
  if (milliseconds < 86_400_000) {
    return `In ${Math.floor(milliseconds / 3_600_000)} hr${Math.floor(milliseconds / 3_600_000) === 1 ? "" : "s"}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formattedDate(value, options = { hour: "numeric", minute: "2-digit" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, options);
}

function renderTasks() {
  const query = document.querySelector("#task-search").value.trim().toLowerCase();
  const filtered = tasks.filter((task) => task.name.toLowerCase().includes(query) || task.cronExpression.toLowerCase().includes(query));
  document.querySelector("#active-count").textContent = tasks.length;
  document.querySelector("#task-count").textContent = tasks.length;
  document.querySelector("#table-summary").textContent = `Showing ${filtered.length} task${filtered.length === 1 ? "" : "s"}`;
  emptyState.hidden = tasks.length > 0;
  noResults.hidden = tasks.length === 0 || filtered.length > 0;
  taskList.innerHTML = filtered.map((task, index) => {
    const initials = task.name.trim().charAt(0).toUpperCase() || "T";
    return `<tr>
      <td><div class="task-cell"><span class="task-avatar color-${index % 4}">${escapeHtml(initials)}</span><div><div class="task-name">${escapeHtml(task.name)}</div><div class="task-sub">Created in this workspace</div></div></div></td>
      <td><code class="cron-chip">${escapeHtml(task.cronExpression)}</code></td>
      <td class="next-cell">${escapeHtml(formattedDate(task.nextRun))}<small>${escapeHtml(relativeTime(task.nextRun))}</small></td>
      <td><span class="status-badge"><i></i> Active</span></td>
      <td><button class="row-menu" data-delete="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.name)}" title="Delete task">···</button></td>
    </tr>`;
  }).join("");

  const nextTask = tasks.filter((task) => task.nextRun).sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun))[0];
  document.querySelector("#next-run").textContent = nextTask ? relativeTime(nextTask.nextRun) : "—";
  document.querySelector("#next-run-name").textContent = nextTask ? nextTask.name : "No upcoming runs";
  renderActivity();
}

function renderActivity() {
  const today = new Date();
  const runsToday = recentRuns.filter((run) => {
    const date = new Date(run.ranAt);
    return date.toDateString() === today.toDateString();
  }).length;
  document.querySelector("#runs-today").textContent = runsToday;
  const activity = document.querySelector("#activity-list");
  if (!recentRuns.length) {
    activity.innerHTML = '<div class="activity-empty">No task runs yet. Activity will appear here after your first scheduled run.</div>';
    return;
  }
  activity.innerHTML = recentRuns.slice(0, 6).map((run) => `<div class="activity-row"><span class="activity-check">✓</span><div class="activity-copy"><strong>${escapeHtml(run.name)} ran successfully</strong><span>Scheduled task completed</span></div><time class="activity-time" datetime="${escapeHtml(run.ranAt)}">${escapeHtml(formattedDate(run.ranAt))}</time></div>`).join("");
}

async function refreshTasks() {
  try {
    const response = await fetch("/api/tasks", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load tasks.");
    tasks = data.tasks || [];
    recentRuns = data.recentRuns || [];
    renderTasks();
  } catch (error) {
    showToast(error.message || "Could not connect to the scheduler.");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function openModal() {
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("#form-error").textContent = "";
  setTimeout(() => document.querySelector("#task-name").focus(), 0);
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  taskForm.reset();
  document.querySelector("#cron-preview").textContent = "Add a cron expression to schedule your task";
}

function updateCronPreview() {
  const expression = cronInput.value.trim();
  const descriptions = {
    "* * * * *": "Every minute",
    "0 * * * *": "At the start of every hour",
    "0 9 * * *": "Every day at 9:00 AM",
    "0 9 * * 1-5": "At 9:00 AM, Monday through Friday",
    "0 0 * * 0": "Every Sunday at midnight",
    "*/5 * * * *": "Every 5 minutes",
    "*/10 * * * *": "Every 10 minutes",
    "30 8 * * 1-5": "At 8:30 AM, Monday through Friday",
  };
  document.querySelector("#cron-preview").textContent = descriptions[expression] || (expression ? "Custom cron schedule · server local time" : "Add a cron expression to schedule your task");
}

async function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || !window.confirm(`Delete “${task.name}”? This will stop its schedule.`)) return;
  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete task.");
    showToast("Task deleted.");
    await refreshTasks();
  } catch (error) {
    showToast(error.message || "Could not delete task.");
  }
}

document.querySelector("#new-task-button").addEventListener("click", openModal);
document.querySelector("#empty-create").addEventListener("click", openModal);
document.querySelector("#modal-close").addEventListener("click", closeModal);
document.querySelector("#cancel-button").addEventListener("click", closeModal);
document.querySelector("#refresh-button").addEventListener("click", refreshTasks);
document.querySelector("#task-search").addEventListener("input", renderTasks);
cronInput.addEventListener("input", updateCronPreview);
taskList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (button) deleteTask(button.dataset.delete);
});
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector("#submit-button");
  const errorElement = document.querySelector("#form-error");
  errorElement.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Creating…";
  try {
    const formData = new FormData(taskForm);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name: formData.get("name"), cronExpression: formData.get("cronExpression") }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create task.");
    closeModal();
    showToast("Your task is scheduled.");
    await refreshTasks();
  } catch (error) {
    errorElement.textContent = error.message || "Could not create task.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Create task <span>→</span>';
  }
});

document.querySelector(".eyebrow").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
refreshTasks();
setInterval(() => {
  if (document.visibilityState === "visible") refreshTasks();
}, 15_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshTasks();
});
setInterval(() => {
  if (!modalBackdrop.hidden) return;
  const nextTask = tasks.filter((task) => task.nextRun).sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun))[0];
  if (nextTask) document.querySelector("#next-run").textContent = relativeTime(nextTask.nextRun);
}, 30_000);
