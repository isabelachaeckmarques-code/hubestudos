const pomodoroScoreStorageKey = "hub-estudos:score:v1";
const pointsPerFocusSession = 25;
const pomodoroModes = {
  focus: { label: "Foco", duration: 25 * 60 },
  shortBreak: { label: "Pausa curta", duration: 5 * 60 },
  longBreak: { label: "Pausa longa", duration: 15 * 60 }
};
const pomodoroModeButtons = document.querySelectorAll(".mode-button");
const pomodoroTimer = document.querySelector("#pomodoro-timer");
const pomodoroModeLabel = document.querySelector("#pomodoro-mode-label");
const pomodoroStatus = document.querySelector("#pomodoro-status");
const pomodoroStartButton = document.querySelector("#pomodoro-start");
const pomodoroPauseButton = document.querySelector("#pomodoro-pause");
const pomodoroResetButton = document.querySelector("#pomodoro-reset");
const focusSessionsCount = document.querySelector("#focus-sessions-count");
const scorePoints = document.querySelector("#score-points");
const scoreStorageStatus = document.querySelector("#score-storage-status");

let currentPomodoroMode = "focus";
let remainingSeconds = pomodoroModes.focus.duration;
let pomodoroDeadline = null;
let pomodoroInterval = null;
let focusSessionAwarded = false;
let score = { points: 0, completedFocusSessions: 0 };

function isValidScore(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Number.isSafeInteger(value.points) &&
    value.points >= 0 &&
    Number.isSafeInteger(value.completedFocusSessions) &&
    value.completedFocusSessions >= 0 &&
    value.points === value.completedFocusSessions * pointsPerFocusSession;
}

function loadScore() {
  let savedScore;
  try {
    savedScore = window.localStorage.getItem(pomodoroScoreStorageKey);
  } catch (error) {
    showScoreStorageMessage("Não foi possível acessar a pontuação salva neste navegador.", true);
    return { points: 0, completedFocusSessions: 0 };
  }

  if (savedScore === null) {
    return { points: 0, completedFocusSessions: 0 };
  }

  let parsedScore;
  try {
    parsedScore = JSON.parse(savedScore);
  } catch (error) {
    showScoreStorageMessage("Os dados de pontuação salvos não puderam ser lidos.", true);
    return { points: 0, completedFocusSessions: 0 };
  }

  if (!isValidScore(parsedScore)) {
    showScoreStorageMessage("Os dados de pontuação salvos têm um formato inválido.", true);
    return { points: 0, completedFocusSessions: 0 };
  }

  return parsedScore;
}

function showScoreStorageMessage(message, isError) {
  scoreStorageStatus.textContent = message;
  scoreStorageStatus.classList.toggle("is-error", isError);
}

function renderScore() {
  scorePoints.textContent = String(score.points);
  focusSessionsCount.textContent = String(score.completedFocusSessions);
}

function saveScore() {
  try {
    window.localStorage.setItem(pomodoroScoreStorageKey, JSON.stringify(score));
    showScoreStorageMessage("", false);
    return true;
  } catch (error) {
    showScoreStorageMessage("A pontuação foi atualizada nesta sessão, mas não pôde ser salva neste navegador.", true);
    return false;
  }
}

function renderPomodoro() {
  const displayedSeconds = Math.max(0, Math.ceil(remainingSeconds));
  const minutes = Math.floor(displayedSeconds / 60);
  const seconds = displayedSeconds % 60;
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");
  pomodoroTimer.textContent = formattedMinutes + ":" + formattedSeconds;
  pomodoroTimer.dateTime = "PT" + displayedSeconds + "S";
  pomodoroTimer.setAttribute(
    "aria-label",
    "Tempo restante: " + formattedMinutes + " minutos e " + formattedSeconds + " segundos"
  );
  pomodoroModeLabel.textContent = pomodoroModes[currentPomodoroMode].label;
  pomodoroStartButton.disabled = pomodoroInterval !== null || displayedSeconds === 0;
  pomodoroPauseButton.disabled = pomodoroInterval === null;
  pomodoroStartButton.querySelector("span").textContent = pomodoroInterval !== null
    ? "Em andamento"
    : displayedSeconds === 0
      ? "Finalizado"
      : displayedSeconds < pomodoroModes[currentPomodoroMode].duration
        ? "Continuar"
        : "Iniciar";

  pomodoroModeButtons.forEach(function (button) {
    const isSelected = button.dataset.mode === currentPomodoroMode;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = pomodoroInterval !== null;
  });
}

function stopPomodoroInterval() {
  if (pomodoroInterval !== null) {
    window.clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
}

function finishPomodoro() {
  let pointsAwarded = false;
  let scoreSaved = true;
  if (currentPomodoroMode === "focus" && !focusSessionAwarded) {
    focusSessionAwarded = true;
    score.completedFocusSessions += 1;
    score.points = score.completedFocusSessions * pointsPerFocusSession;
    renderScore();
    pointsAwarded = true;
    scoreSaved = saveScore();
  }

  stopPomodoroInterval();
  pomodoroDeadline = null;
  remainingSeconds = 0;
  renderPomodoro();

  if (currentPomodoroMode !== "focus") {
    pomodoroStatus.textContent = "Período de descanso concluído. Hora de voltar ao foco.";
  } else if (!pointsAwarded) {
    pomodoroStatus.textContent = "Período de foco concluído. Esta sessão já foi contabilizada.";
  } else {
    pomodoroStatus.textContent = scoreSaved
      ? "Período de foco concluído. +25 pontos adicionados."
      : "Período de foco concluído. +25 pontos nesta sessão, mas não foi possível salvá-los.";
  }
}

function updatePomodoro() {
  if (pomodoroDeadline === null) {
    return;
  }
  remainingSeconds = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
  if (remainingSeconds === 0) {
    finishPomodoro();
    return;
  }
  renderPomodoro();
}

function startPomodoro() {
  if (pomodoroInterval !== null || remainingSeconds <= 0) {
    return;
  }
  pomodoroDeadline = Date.now() + remainingSeconds * 1000;
  pomodoroInterval = window.setInterval(updatePomodoro, 1000);
  pomodoroStatus.textContent = currentPomodoroMode === "focus"
    ? "Período de foco em andamento."
    : "Período de descanso em andamento.";
  renderPomodoro();
}

function pausePomodoro() {
  if (pomodoroInterval === null || pomodoroDeadline === null) {
    return;
  }
  remainingSeconds = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
  if (remainingSeconds === 0) {
    finishPomodoro();
    return;
  }
  stopPomodoroInterval();
  pomodoroDeadline = null;
  renderPomodoro();
  pomodoroStatus.textContent = "Temporizador pausado. Você pode continuar quando quiser.";
}

function resetPomodoro() {
  stopPomodoroInterval();
  pomodoroDeadline = null;
  remainingSeconds = pomodoroModes[currentPomodoroMode].duration;
  focusSessionAwarded = false;
  renderPomodoro();
  pomodoroStatus.textContent = "Temporizador reiniciado para " + pomodoroModes[currentPomodoroMode].label + ".";
}

pomodoroStartButton.addEventListener("click", startPomodoro);
pomodoroPauseButton.addEventListener("click", pausePomodoro);
pomodoroResetButton.addEventListener("click", resetPomodoro);

pomodoroModeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const selectedMode = button.dataset.mode;
    if (pomodoroInterval !== null || selectedMode === currentPomodoroMode) {
      return;
    }
    currentPomodoroMode = selectedMode;
    remainingSeconds = pomodoroModes[currentPomodoroMode].duration;
    pomodoroDeadline = null;
    focusSessionAwarded = false;
    renderPomodoro();
    pomodoroStatus.textContent = pomodoroModes[currentPomodoroMode].label + " selecionado. Pressione Iniciar para começar.";
  });
});

score = loadScore();
renderScore();
renderPomodoro();
