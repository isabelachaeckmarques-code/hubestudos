const activitiesStorageKey = "hub-estudos:activities:v1";
const dashboardScoreStorageKey = "hub-estudos:score:v1";
const dashboardPointsPerFocus = 25;
const dashboardStorageStatus = document.querySelector("#dashboard-storage-status");

function showDashboardStorageError() {
  dashboardStorageStatus.textContent = "Alguns dados não puderam ser lidos do armazenamento deste navegador.";
}

function readDashboardStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    showDashboardStorageError();
    return fallback;
  }
}

function getDashboardScore() {
  const value = readDashboardStorage(dashboardScoreStorageKey, null);
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isSafeInteger(value.points) ||
    !Number.isSafeInteger(value.completedFocusSessions) ||
    value.points < 0 ||
    value.completedFocusSessions < 0 ||
    value.points !== value.completedFocusSessions * dashboardPointsPerFocus
  ) {
    if (value !== null) {
      showDashboardStorageError();
    }
    return { points: 0, completedFocusSessions: 0 };
  }

  return value;
}

function isValidDashboardDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isDashboardActivity(activity) {
  return activity !== null &&
    typeof activity === "object" &&
    Number.isInteger(activity.id) &&
    typeof activity.subject === "string" &&
    typeof activity.task === "string" &&
    isValidDashboardDate(activity.date) &&
    typeof activity.time === "string" &&
    /^\d{2}:\d{2}$/.test(activity.time) &&
    Number(activity.time.slice(0, 2)) < 24 &&
    Number(activity.time.slice(3, 5)) < 60 &&
    ["low", "medium", "high"].includes(activity.priority) &&
    typeof activity.completed === "boolean";
}

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function renderDashboard() {
  const now = new Date();
  const score = getDashboardScore();
  const activities = readDashboardStorage(activitiesStorageKey, []);
  const safeActivities = Array.isArray(activities)
    ? activities.filter(isDashboardActivity)
    : [];
  if (!Array.isArray(activities) || safeActivities.length !== activities.length) {
    showDashboardStorageError();
  }
  const totalMinutes = score.completedFocusSessions * 25;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";

  document.querySelector("#welcome-date").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(now).toLocaleUpperCase("pt-BR");
  document.querySelector("#welcome-greeting").textContent = greeting;
  document.querySelector("#welcome-student-name").textContent =
    document.querySelector("#header-student-name").textContent.replace(/^Olá,\s*/, "");
  document.querySelector("#hours-studied").textContent = hours + "h " + minutes + "min";
  document.querySelector("#completed-task-count").textContent = String(
    safeActivities.filter(function (activity) {
      return activity.completed;
    }).length
  );
  document.querySelector("#score-points").textContent = String(score.points);
  document.querySelector("#focus-sessions-count").textContent = String(score.completedFocusSessions);

  const pendingActivities = safeActivities.filter(function (activity) {
    return !activity.completed;
  }).sort(function (first, second) {
    return first.date.localeCompare(second.date) ||
      first.time.localeCompare(second.time) ||
      first.id - second.id;
  });
  const nextActivity = pendingActivities[0];

  if (!nextActivity) {
    document.querySelector("#next-activity-title").textContent = "Nenhuma atividade planejada";
    document.querySelector("#next-activity-details").textContent = "Adicione tarefas na Minha Rotina.";
    return;
  }

  const due = new Date(nextActivity.date + "T" + nextActivity.time);
  const isOverdue = due < now;
  document.querySelector("#next-activity-title").textContent = nextActivity.task;
  document.querySelector("#next-activity-details").textContent =
    nextActivity.subject + " · " +
    (isOverdue ? "Pendente desde " : "") +
    formatDashboardDate(due) + " às " + nextActivity.time;
}

renderDashboard();
