const flashcardsStorageKey = "hub-estudos:flashcards:v1";
const flashcardForm = document.querySelector("#flashcard-form");
const flashcardSubjectInput = document.querySelector("#flashcard-subject");
const flashcardQuestionInput = document.querySelector("#flashcard-question");
const flashcardAnswerInput = document.querySelector("#flashcard-answer");
const flashcardFormTitle = document.querySelector("#flashcard-form-title");
const flashcardSubmitButton = document.querySelector("#flashcard-submit");
const flashcardCancelEditButton = document.querySelector("#flashcard-cancel-edit");
const flashcardFeedback = document.querySelector("#flashcard-feedback");
const flashcardSearchInput = document.querySelector("#flashcard-search-input");
const flashcardCount = document.querySelector("#flashcard-count");
const flashcardEmptyState = document.querySelector("#flashcard-empty-state");
const flashcardGroups = document.querySelector("#flashcard-groups");
const reviewEmptyState = document.querySelector("#review-empty-state");
const reviewContent = document.querySelector("#review-content");
const reviewPosition = document.querySelector("#review-position");
const reviewSubject = document.querySelector("#review-subject");
const reviewQuestion = document.querySelector("#review-question");
const reviewRevealButton = document.querySelector("#review-reveal");
const reviewAnswerArea = document.querySelector("#review-answer-area");
const reviewAnswer = document.querySelector("#review-answer");
const reviewLearnedButton = document.querySelector("#review-learned");
const reviewNeedsReviewButton = document.querySelector("#review-needs-review");
const reviewNextButton = document.querySelector("#review-next");
const reviewFeedback = document.querySelector("#review-feedback");
const reviewComplete = document.querySelector("#review-complete");
const reviewSummary = document.querySelector("#review-summary");
const reviewAgainButton = document.querySelector("#review-again");
const subjectCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

let flashcards = [];
let nextFlashcardId = 1;
let editingFlashcardId = null;
let storageReady = true;
let reviewQueue = [];
let reviewIndex = 0;
let reviewRevealed = false;
let reviewChoice = null;
let reviewChoices = {};

function showFlashcardFeedback(message, isError) {
  flashcardFeedback.textContent = message;
  flashcardFeedback.classList.toggle("is-error", isError);
}

function isStoredFlashcard(flashcard) {
  return flashcard !== null &&
    typeof flashcard === "object" &&
    !Array.isArray(flashcard) &&
    Number.isSafeInteger(flashcard.id) &&
    flashcard.id > 0 &&
    typeof flashcard.subject === "string" &&
    flashcard.subject.trim() !== "" &&
    flashcard.subject.length <= 60 &&
    typeof flashcard.question === "string" &&
    flashcard.question.trim() !== "" &&
    flashcard.question.length <= 300 &&
    typeof flashcard.answer === "string" &&
    flashcard.answer.trim() !== "" &&
    flashcard.answer.length <= 2000;
}

function loadFlashcards() {
  let savedFlashcards;
  try {
    savedFlashcards = window.localStorage.getItem(flashcardsStorageKey);
  } catch (error) {
    storageReady = false;
    showFlashcardFeedback("Não foi possível acessar o armazenamento local. Os cartões desta sessão não serão salvos.", true);
    return [];
  }

  if (savedFlashcards === null) {
    return [];
  }

  let parsedFlashcards;
  try {
    parsedFlashcards = JSON.parse(savedFlashcards);
  } catch (error) {
    storageReady = false;
    showFlashcardFeedback("Os cartões salvos não puderam ser lidos. O conteúdo existente foi preservado.", true);
    return [];
  }

  if (
    !Array.isArray(parsedFlashcards) ||
    !parsedFlashcards.every(isStoredFlashcard) ||
    new Set(parsedFlashcards.map(function (flashcard) {
      return flashcard.id;
    })).size !== parsedFlashcards.length
  ) {
    storageReady = false;
    showFlashcardFeedback("Os cartões salvos têm um formato inválido. O conteúdo existente foi preservado.", true);
    return [];
  }

  return parsedFlashcards;
}

function saveFlashcards() {
  if (!storageReady) {
    return false;
  }

  try {
    window.localStorage.setItem(flashcardsStorageKey, JSON.stringify(flashcards));
    return true;
  } catch (error) {
    storageReady = false;
    return false;
  }
}

function normalizeSearchText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function createFlashcardElement(flashcard) {
  const item = document.createElement("li");
  item.className = "flashcard-item";
  item.dataset.id = String(flashcard.id);

  const flipButton = document.createElement("button");
  flipButton.type = "button";
  flipButton.className = "flashcard-button";
  flipButton.dataset.action = "flip";
  flipButton.setAttribute("aria-pressed", "false");
  flipButton.setAttribute("aria-label", "Mostrar resposta para: " + flashcard.question);

  const inner = document.createElement("span");
  inner.className = "flashcard-inner";
  const front = document.createElement("span");
  front.className = "flashcard-side flashcard-front";
  const frontLabel = document.createElement("span");
  frontLabel.className = "flashcard-side-label";
  frontLabel.textContent = flashcard.subject + " · Pergunta";
  const question = document.createElement("span");
  question.className = "flashcard-question";
  question.textContent = flashcard.question;
  const hint = document.createElement("span");
  hint.className = "flashcard-hint";
  hint.textContent = "Clique ou pressione Enter para virar";
  front.append(frontLabel, question, hint);

  const back = document.createElement("span");
  back.className = "flashcard-side flashcard-back";
  const backLabel = document.createElement("span");
  backLabel.className = "flashcard-side-label";
  backLabel.textContent = flashcard.subject + " · Resposta";
  const answer = document.createElement("span");
  answer.className = "flashcard-answer";
  answer.textContent = flashcard.answer;
  const backHint = document.createElement("span");
  backHint.className = "flashcard-hint";
  backHint.textContent = "Vire novamente para ver a pergunta";
  back.append(backLabel, answer, backHint);
  inner.append(front, back);
  flipButton.append(inner);

  const actions = document.createElement("div");
  actions.className = "flashcard-actions";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.textContent = "Editar";
  editButton.setAttribute("aria-label", "Editar cartão: " + flashcard.question);
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-flashcard";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Excluir";
  deleteButton.setAttribute("aria-label", "Excluir cartão: " + flashcard.question);
  actions.append(editButton, deleteButton);
  item.append(flipButton, actions);
  return item;
}

function renderFlashcards() {
  const searchTerm = normalizeSearchText(flashcardSearchInput.value.trim());
  const visibleFlashcards = flashcards.filter(function (flashcard) {
    return normalizeSearchText(flashcard.subject).includes(searchTerm);
  });
  const groupedFlashcards = new Map();

  visibleFlashcards.forEach(function (flashcard) {
    const subjectKey = normalizeSearchText(flashcard.subject);
    if (!groupedFlashcards.has(subjectKey)) {
      groupedFlashcards.set(subjectKey, {
        subject: flashcard.subject,
        cards: []
      });
    }
    groupedFlashcards.get(subjectKey).cards.push(flashcard);
  });

  flashcardGroups.replaceChildren();
  Array.from(groupedFlashcards.values()).sort(function (first, second) {
    return subjectCollator.compare(first.subject, second.subject);
  }).forEach(function (group, index) {
    const section = document.createElement("section");
    section.className = "flashcard-subject";
    section.setAttribute("aria-labelledby", "flashcard-subject-" + index);
    const heading = document.createElement("h3");
    heading.className = "flashcard-subject-heading";
    heading.id = "flashcard-subject-" + index;
    const title = document.createElement("span");
    title.textContent = group.subject;
    const count = document.createElement("span");
    count.className = "flashcard-subject-count";
    count.textContent = group.cards.length === 1 ? "1 cartão" : group.cards.length + " cartões";
    heading.append(title, count);

    const list = document.createElement("ul");
    list.className = "flashcard-list";
    group.cards.forEach(function (flashcard) {
      list.append(createFlashcardElement(flashcard));
    });
    section.append(heading, list);
    flashcardGroups.append(section);
  });

  flashcardCount.textContent = flashcards.length === 1
    ? "1 cartão"
    : flashcards.length + " cartões";
  flashcardGroups.hidden = visibleFlashcards.length === 0;
  flashcardEmptyState.hidden = visibleFlashcards.length > 0;
  if (flashcards.length === 0) {
    flashcardEmptyState.textContent = "Nenhum cartão cadastrado. Crie seu primeiro cartão.";
  } else if (visibleFlashcards.length === 0) {
    flashcardEmptyState.textContent = "Nenhum cartão encontrado para essa matéria.";
  }
}

function getReviewChoiceCount(choice) {
  return Object.values(reviewChoices).filter(function (value) {
    return value === choice;
  }).length;
}

function renderReview() {
  reviewQueue = flashcards.slice().sort(function (first, second) {
    return first.id - second.id;
  });
  reviewEmptyState.hidden = reviewQueue.length > 0;
  reviewContent.hidden = reviewQueue.length === 0 || reviewIndex >= reviewQueue.length;
  reviewComplete.hidden = reviewQueue.length === 0 || reviewIndex < reviewQueue.length;

  if (reviewQueue.length === 0) {
    return;
  }

  if (reviewIndex >= reviewQueue.length) {
    const learned = getReviewChoiceCount("learned");
    const needsReview = getReviewChoiceCount("review");
    reviewSummary.textContent =
      "Revisão concluída: " + learned + (learned === 1 ? " cartão marcado como aprendido" : " cartões marcados como aprendidos") +
      " e " + needsReview + (needsReview === 1 ? " cartão para revisar novamente." : " cartões para revisar novamente.");
    return;
  }

  const flashcard = reviewQueue[reviewIndex];
  reviewPosition.textContent = "Cartão " + (reviewIndex + 1) + " de " + reviewQueue.length;
  reviewSubject.textContent = flashcard.subject;
  reviewQuestion.textContent = flashcard.question;
  reviewAnswer.textContent = flashcard.answer;
  reviewAnswerArea.hidden = !reviewRevealed;
  reviewRevealButton.hidden = reviewRevealed;
  reviewLearnedButton.disabled = !reviewRevealed;
  reviewNeedsReviewButton.disabled = !reviewRevealed;
  reviewLearnedButton.classList.toggle("is-selected", reviewChoice === "learned");
  reviewLearnedButton.setAttribute("aria-pressed", String(reviewChoice === "learned"));
  reviewNeedsReviewButton.classList.toggle("is-selected", reviewChoice === "review");
  reviewNeedsReviewButton.setAttribute("aria-pressed", String(reviewChoice === "review"));
  reviewNextButton.disabled = reviewChoice === null;
  reviewFeedback.textContent = reviewChoice === null
    ? ""
    : "Resposta registrada nesta revisão. Avance quando estiver pronto.";
}

function restartReview() {
  reviewIndex = 0;
  reviewRevealed = false;
  reviewChoice = null;
  reviewChoices = {};
  renderReview();
}

function reportFlashcardChange(successMessage) {
  const saved = saveFlashcards();
  showFlashcardFeedback(
    saved
      ? successMessage
      : storageReady
        ? "A alteração ficou nesta sessão, mas não foi possível salvá-la no navegador."
        : "A alteração ficou nesta sessão, mas os dados locais não puderam ser salvos. O conteúdo anterior foi preservado.",
    !saved
  );
  renderFlashcards();
  restartReview();
}

function beginFlashcardEditing(flashcard) {
  editingFlashcardId = flashcard.id;
  flashcardSubjectInput.value = flashcard.subject;
  flashcardQuestionInput.value = flashcard.question;
  flashcardAnswerInput.value = flashcard.answer;
  flashcardFormTitle.textContent = "Editar cartão";
  flashcardSubmitButton.textContent = "Salvar alterações";
  flashcardCancelEditButton.hidden = false;
  flashcardSubjectInput.focus();
}

function cancelFlashcardEditing() {
  editingFlashcardId = null;
  flashcardForm.reset();
  flashcardFormTitle.textContent = "Criar um cartão";
  flashcardSubmitButton.textContent = "Salvar cartão";
  flashcardCancelEditButton.hidden = true;
}

flashcardForm.addEventListener("submit", function (event) {
  event.preventDefault();
  showFlashcardFeedback("", false);
  flashcardSubjectInput.value = flashcardSubjectInput.value.trim();
  flashcardQuestionInput.value = flashcardQuestionInput.value.trim();
  flashcardAnswerInput.value = flashcardAnswerInput.value.trim();
  if (!flashcardForm.reportValidity()) {
    return;
  }

  const formData = new FormData(flashcardForm);
  const values = {
    subject: formData.get("subject"),
    question: formData.get("question"),
    answer: formData.get("answer")
  };

  if (editingFlashcardId === null) {
    if (!Number.isSafeInteger(nextFlashcardId)) {
      showFlashcardFeedback("Não foi possível gerar outro identificador para os cartões.", true);
      return;
    }
    flashcards.push(Object.assign({ id: nextFlashcardId }, values));
    nextFlashcardId += 1;
    cancelFlashcardEditing();
    reportFlashcardChange("Cartão salvo neste navegador.");
    return;
  }

  const flashcard = flashcards.find(function (entry) {
    return entry.id === editingFlashcardId;
  });
  if (!flashcard) {
    cancelFlashcardEditing();
    showFlashcardFeedback("O cartão selecionado não está mais disponível.", true);
    return;
  }

  Object.assign(flashcard, values);
  cancelFlashcardEditing();
  reportFlashcardChange("Alterações do cartão salvas neste navegador.");
});

flashcardCancelEditButton.addEventListener("click", cancelFlashcardEditing);
flashcardSearchInput.addEventListener("input", renderFlashcards);

flashcardGroups.addEventListener("click", function (event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const item = actionButton.closest(".flashcard-item");
  const flashcardId = Number(item.dataset.id);
  const flashcard = flashcards.find(function (entry) {
    return entry.id === flashcardId;
  });
  if (!flashcard) {
    showFlashcardFeedback("O cartão selecionado não está mais disponível.", true);
    return;
  }

  if (actionButton.dataset.action === "flip") {
    const isFlipped = actionButton.classList.toggle("is-flipped");
    actionButton.setAttribute("aria-pressed", String(isFlipped));
    actionButton.setAttribute(
      "aria-label",
      (isFlipped ? "Mostrar pergunta para: " : "Mostrar resposta para: ") + flashcard.question
    );
    return;
  }

  if (actionButton.dataset.action === "edit") {
    beginFlashcardEditing(flashcard);
    return;
  }

  flashcards = flashcards.filter(function (entry) {
    return entry.id !== flashcardId;
  });
  if (editingFlashcardId === flashcardId) {
    cancelFlashcardEditing();
  }
  reportFlashcardChange("Cartão excluído e alteração salva neste navegador.");
});

reviewRevealButton.addEventListener("click", function () {
  reviewRevealed = true;
  renderReview();
});

reviewLearnedButton.addEventListener("click", function () {
  if (!reviewRevealed || reviewIndex >= reviewQueue.length) {
    return;
  }
  reviewChoice = "learned";
  reviewChoices[reviewQueue[reviewIndex].id] = reviewChoice;
  renderReview();
});

reviewNeedsReviewButton.addEventListener("click", function () {
  if (!reviewRevealed || reviewIndex >= reviewQueue.length) {
    return;
  }
  reviewChoice = "review";
  reviewChoices[reviewQueue[reviewIndex].id] = reviewChoice;
  renderReview();
});

reviewNextButton.addEventListener("click", function () {
  if (reviewChoice === null || reviewIndex >= reviewQueue.length) {
    return;
  }
  reviewIndex += 1;
  reviewRevealed = false;
  reviewChoice = null;
  renderReview();
});

reviewAgainButton.addEventListener("click", restartReview);

flashcards = loadFlashcards();
nextFlashcardId = flashcards.reduce(function (nextId, flashcard) {
  return Math.max(nextId, flashcard.id + 1);
}, 1);
renderFlashcards();
renderReview();
