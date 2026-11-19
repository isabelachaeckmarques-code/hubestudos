const routineStorageKey = "hub-estudos:activities:v1";
const activityForm = document.querySelector("#activity-form");
const activityList = document.querySelector("#activity-list");
const emptyState = document.querySelector("#empty-state");
const activityTotal = document.querySelector("#activity-total");
const formFeedback = document.querySelector("#form-feedback");
const filterButtons = document.querySelectorAll(".filter-button");
const formTitle = document.querySelector("#activity-form-title");
const submitButton = document.querySelector("#activity-submit");
const cancelEditButton = document.querySelector("#cancel-edit");

let activities = [];
let currentFilter = "all";
let nextActivityId = 1;
let editingActivityId = null;

function showFormFeedback(message, isError) {
  formFeedback.textContent = message;
  formFeedback.classList.toggle("is-error", isError);
}

function isValidStoredDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isStoredActivity(activity) {
  return activity !== null &&
    typeof activity === "object" &&
    Number.isInteger(activity.id) &&
    activity.id > 0 &&
    typeof activity.subject === "string" &&
    activity.subject.length <= 60 &&
    activity.subject.trim() !== "" &&
    typeof activity.task === "string" &&
    activity.task.length <= 100 &&
    activity.task.trim() !== "" &&
    isValidStoredDate(activity.date) &&
    typeof activity.time === "string" &&
    /^\d{2}:\d{2}$/.test(activity.time) &&
    Number(activity.time.slice(0, 2)) < 24 &&
    Number(activity.time.slice(3, 5)) < 60 &&
    ["low", "medium", "high"].includes(activity.priority) &&
    typeof activity.completed === "boolean";
}

function loadActivities() {
  let savedActivities;

  try {
    savedActivities = window.localStorage.getItem(routineStorageKey);
  } catch (error) {
    showFormFeedback("Não foi possível acessar o armazenamento local. As alterações ficarão apenas nesta sessão.", true);
    return [];
  }

  if (savedActivities === null) {
    return [];
  }

  let parsedActivities;
  try {
    parsedActivities = JSON.parse(savedActivities);
  } catch (error) {
    showFormFeedback("Os dados salvos não puderam ser lidos. As atividades não foram carregadas.", true);
    return [];
  }

  if (
    !Array.isArray(parsedActivities) ||
    !parsedActivities.every(isStoredActivity) ||
    new Set(parsedActivities.map(function (activity) {
      return activity.id;
    })).size !== parsedActivities.length
  ) {
    showFormFeedback("Os dados salvos têm um formato inválido e as atividades não foram carregadas.", true);
    return [];
  }

  return parsedActivities;
}

function saveActivities() {
  try {
    window.localStorage.setItem(routineStorageKey, JSON.stringify(activities));
    return true;
  } catch (error) {
    return false;
  }
}

function formatActivityDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date + "T00:00:00"));
}

function createActivityElement(activity) {
  const item = document.createElement("li");
  item.className = "routine-item priority-" + activity.priority;
  item.dataset.id = String(activity.id);
  item.classList.toggle("is-completed", activity.completed);

  const main = document.createElement("div");
  main.className = "routine-item-main";
  const check = document.createElement("span");
  check.className = "routine-check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = activity.completed ? "✓" : "";

  const copy = document.createElement("div");
  copy.className = "routine-item-copy";
  const meta = document.createElement("div");
  meta.className = "routine-item-meta";
  const priority = document.createElement("span");
  priority.className = "priority-badge";
  priority.textContent = {
    low: "Prioridade baixa",
    medium: "Prioridade média",
    high: "Prioridade alta"
  }[activity.priority];
  meta.append(priority);

  if (activity.completed) {
    const completion = document.createElement("span");
    completion.className = "completion-badge";
    completion.textContent = "Concluída";
    meta.append(completion);
  }

  const subject = document.createElement("p");
  subject.className = "routine-subject";
  subject.textContent = activity.subject;
  const task = document.createElement("h4");
  task.className = "routine-task";
  task.textContent = activity.task;
  const due = document.createElement("time");
  due.className = "routine-due";
  due.dateTime = activity.date + "T" + activity.time;
  due.textContent = formatActivityDate(activity.date) + " · " + activity.time;
  copy.append(meta, subject, task, due);
  main.append(check, copy);

  const actions = document.createElement("div");
  actions.className = "routine-actions";
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.dataset.action = "toggle";
  toggleButton.textContent = activity.completed ? "Reabrir" : "Concluir";
  toggleButton.setAttribute("aria-label", (activity.completed ? "Reabrir: " : "Marcar como concluída: ") + activity.task);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-activity";
  editButton.dataset.action = "edit";
  editButton.textContent = "Editar";
  editButton.setAttribute("aria-label", "Editar: " + activity.task);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-activity";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Excluir";
  deleteButton.setAttribute("aria-label", "Excluir: " + activity.task);
  actions.append(toggleButton, editButton, deleteButton);
  item.append(main, actions);
  return item;
}

function renderActivities() {
  const sortedActivities = activities.slice().sort(function (first, second) {
    return first.date.localeCompare(second.date) ||
      first.time.localeCompare(second.time) ||
      first.id - second.id;
  });
  const visibleActivities = sortedActivities.filter(function (activity) {
    if (currentFilter === "pending") {
      return !activity.completed;
    }
    if (currentFilter === "completed") {
      return activity.completed;
    }
    return true;
  });

  activityList.replaceChildren();
  visibleActivities.forEach(function (activity) {
    activityList.append(createActivityElement(activity));
  });
  activityList.hidden = visibleActivities.length === 0;
  emptyState.hidden = visibleActivities.length > 0;

  if (activities.length === 0) {
    emptyState.textContent = "Nenhuma atividade cadastrada. Adicione uma pelo formulário.";
  } else if (currentFilter === "pending" && visibleActivities.length === 0) {
    emptyState.textContent = "Nenhuma atividade pendente.";
  } else if (currentFilter === "completed" && visibleActivities.length === 0) {
    emptyState.textContent = "Nenhuma atividade concluída.";
  }

  activityTotal.textContent = activities.length === 1 ? "1 atividade" : activities.length + " atividades";
}

function setActivityFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(function (button) {
    const isSelected = button.dataset.filter === filter;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function beginEditing(activity) {
  editingActivityId = activity.id;
  activityForm.elements.subject.value = activity.subject;
  activityForm.elements.task.value = activity.task;
  activityForm.elements.date.value = activity.date;
  activityForm.elements.time.value = activity.time;
  activityForm.elements.priority.value = activity.priority;
  formTitle.textContent = "Editar atividade";
  submitButton.textContent = "Salvar alterações";
  cancelEditButton.hidden = false;
  activityForm.elements.subject.focus();
}

function cancelEditing() {
  editingActivityId = null;
  activityForm.reset();
  formTitle.textContent = "Adicionar atividade";
  submitButton.textContent = "Adicionar atividade";
  cancelEditButton.hidden = true;
}

activityForm.addEventListener("submit", function (event) {
  event.preventDefault();
  showFormFeedback("", false);
  activityForm.elements.subject.value = activityForm.elements.subject.value.trim();
  activityForm.elements.task.value = activityForm.elements.task.value.trim();

  if (!activityForm.reportValidity()) {
    return;
  }

  const formData = new FormData(activityForm);
  const values = {
    subject: formData.get("subject"),
    task: formData.get("task"),
    date: formData.get("date"),
    time: formData.get("time"),
    priority: formData.get("priority")
  };
  let successMessage;

  if (editingActivityId === null) {
    activities.push(Object.assign({ id: nextActivityId, completed: false }, values));
    nextActivityId += 1;
    successMessage = "Atividade adicionada e salva neste navegador.";
  } else {
    const activity = activities.find(function (entry) {
      return entry.id === editingActivityId;
    });
    if (!activity) {
      cancelEditing();
      showFormFeedback("A atividade selecionada não está mais disponível.", true);
      return;
    }
    Object.assign(activity, values);
    successMessage = "Alterações da atividade salvas neste navegador.";
  }

  const wasEditing = editingActivityId !== null;
  cancelEditing();
  if (!wasEditing) {
    setActivityFilter("all");
  }
  const saved = saveActivities();
  showFormFeedback(
    saved ? successMessage : "Alteração aplicada nesta sessão, mas não foi possível salvá-la no navegador.",
    !saved
  );
  renderActivities();
});

cancelEditButton.addEventListener("click", cancelEditing);

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setActivityFilter(button.dataset.filter);
    renderActivities();
  });
});

activityList.addEventListener("click", function (event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const item = actionButton.closest(".routine-item");
  const activityId = Number(item.dataset.id);
  const activity = activities.find(function (entry) {
    return entry.id === activityId;
  });
  if (!activity) {
    showFormFeedback("A atividade selecionada não está mais disponível.", true);
    return;
  }

  if (actionButton.dataset.action === "edit") {
    beginEditing(activity);
    return;
  }

  if (actionButton.dataset.action === "toggle") {
    activity.completed = !activity.completed;
  } else {
    activities = activities.filter(function (entry) {
      return entry.id !== activityId;
    });
    if (editingActivityId === activityId) {
      cancelEditing();
    }
  }

  const saved = saveActivities();
  showFormFeedback(
    saved
      ? (actionButton.dataset.action === "toggle"
        ? (activity.completed ? "Atividade concluída e salva." : "Atividade reaberta e salva.")
        : "Atividade excluída e alteração salva.")
      : "Alteração aplicada nesta sessão, mas não foi possível salvá-la no navegador.",
    !saved
  );
  renderActivities();
});

activities = loadActivities();
nextActivityId = activities.reduce(function (nextId, activity) {
  return Math.max(nextId, activity.id + 1);
}, 1);
renderActivities();
