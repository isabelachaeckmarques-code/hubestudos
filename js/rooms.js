const communityStorageKey = "hub-estudos:community:v1";
const roomsScoreStorageKey = "hub-estudos:score:v1";
const localParticipantId = "local";
const demoParticipants = [
  { id: "demo-1", name: "Marina Alves", points: 375 },
  { id: "demo-2", name: "Lucas Costa", points: 250 },
  { id: "demo-3", name: "Bia Santos", points: 150 }
];
const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const createRoomForm = document.querySelector("#create-room-form");
const joinRoomForm = document.querySelector("#join-room-form");
const participantNameForm = document.querySelector("#participant-name-form");
const participantNameInput = document.querySelector("#participant-name");
const roomCodeInput = document.querySelector("#room-code");
const roomsList = document.querySelector("#rooms-list");
const roomsEmptyState = document.querySelector("#rooms-empty-state");
const roomCount = document.querySelector("#room-count");
const communityFeedback = document.querySelector("#community-feedback");
const selectedRoom = document.querySelector("#selected-room");
const selectedRoomName = document.querySelector("#selected-room-name");
const selectedRoomCode = document.querySelector("#selected-room-code");
const membersEmptyState = document.querySelector("#members-empty-state");
const roomMembersList = document.querySelector("#room-members-list");
const roomMemberCount = document.querySelector("#room-member-count");

let score = { points: 0, completedFocusSessions: 0 };
let communityState = {
  participantName: "ISA",
  rooms: [],
  selectedRoomCode: ""
};

function showCommunityFeedback(message, isError) {
  communityFeedback.textContent = message;
  communityFeedback.classList.toggle("is-error", isError);
}

function isValidRoom(room) {
  const knownParticipantIds = [localParticipantId].concat(demoParticipants.map(function (participant) {
    return participant.id;
  }));
  return room !== null &&
    typeof room === "object" &&
    /^(?:ISA|HUB)-[A-Z0-9]{6}$/.test(room.code) &&
    typeof room.name === "string" &&
    room.name.trim() !== "" &&
    room.name.length <= 50 &&
    Array.isArray(room.participantIds) &&
    room.participantIds.length > 0 &&
    room.participantIds.every(function (participantId) {
      return knownParticipantIds.includes(participantId);
    }) &&
    new Set(room.participantIds).size === room.participantIds.length;
}

function isValidCommunityState(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.participantName !== "string" ||
    value.participantName.trim() === "" ||
    value.participantName.length > 30 ||
    !Array.isArray(value.rooms) ||
    !value.rooms.every(isValidRoom)
  ) {
    return false;
  }
  const roomCodes = value.rooms.map(function (room) {
    return room.code;
  });
  return new Set(roomCodes).size === roomCodes.length &&
    (value.selectedRoomCode === "" || roomCodes.includes(value.selectedRoomCode));
}

function generateUniqueRoomCode(existingCodes) {
  let code;
  do {
    let suffix = "";
    for (let index = 0; index < 6; index += 1) {
      suffix += roomCodeAlphabet[Math.floor(Math.random() * roomCodeAlphabet.length)];
    }
    code = "HUB-" + suffix;
  } while (existingCodes.has(code));
  return code;
}

function migrateRoomCodes(state) {
  const usedCodes = new Set(state.rooms.filter(function (room) {
    return !room.code.startsWith("ISA-");
  }).map(function (room) {
    return room.code;
  }));
  const migratedCodes = new Map();
  const participantName = state.participantName === "Hub de Estudos" ? "ISA" : state.participantName;
  let changed = participantName !== state.participantName;
  const rooms = state.rooms.map(function (room) {
    if (!room.code.startsWith("ISA-")) {
      return room;
    }

    let code = "HUB-" + room.code.slice(4);
    if (usedCodes.has(code)) {
      code = generateUniqueRoomCode(usedCodes);
    }
    usedCodes.add(code);
    migratedCodes.set(room.code, code);
    changed = true;
    return Object.assign({}, room, { code: code });
  });

  return {
    changed: changed,
    state: {
      participantName: participantName,
      rooms: rooms,
      selectedRoomCode: migratedCodes.get(state.selectedRoomCode) || state.selectedRoomCode
    }
  };
}

function loadCommunityState() {
  let savedState;
  try {
    savedState = window.localStorage.getItem(communityStorageKey);
  } catch (error) {
    showCommunityFeedback("Não foi possível acessar o armazenamento local. Os dados das salas ficarão apenas nesta sessão.", true);
    return { participantName: "ISA", rooms: [], selectedRoomCode: "" };
  }
  if (savedState === null) {
    return { participantName: "ISA", rooms: [], selectedRoomCode: "" };
  }

  let parsedState;
  try {
    parsedState = JSON.parse(savedState);
  } catch (error) {
    showCommunityFeedback("Os dados locais das salas não puderam ser lidos.", true);
    return { participantName: "ISA", rooms: [], selectedRoomCode: "" };
  }
  if (!isValidCommunityState(parsedState)) {
    showCommunityFeedback("Os dados locais das salas têm um formato inválido.", true);
    return { participantName: "ISA", rooms: [], selectedRoomCode: "" };
  }

  const migration = migrateRoomCodes(parsedState);
  if (migration.changed) {
    try {
      window.localStorage.setItem(communityStorageKey, JSON.stringify(migration.state));
    } catch (error) {
      showCommunityFeedback("Os dados antigos do perfil e das salas foram atualizados nesta sessão, mas não puderam ser salvos no navegador.", true);
    }
  }
  return migration.state;
}

function saveCommunityState() {
  try {
    window.localStorage.setItem(communityStorageKey, JSON.stringify(communityState));
    return true;
  } catch (error) {
    return false;
  }
}

function loadScore() {
  try {
    const storedScore = window.localStorage.getItem(roomsScoreStorageKey);
    const parsedScore = storedScore === null ? null : JSON.parse(storedScore);
    if (
      parsedScore !== null &&
      Number.isSafeInteger(parsedScore.points) &&
      Number.isSafeInteger(parsedScore.completedFocusSessions) &&
      parsedScore.points >= 0 &&
      parsedScore.completedFocusSessions >= 0 &&
      parsedScore.points === parsedScore.completedFocusSessions * 25
    ) {
      return parsedScore;
    }
  } catch (error) {
    showCommunityFeedback("Não foi possível ler a pontuação salva neste navegador.", true);
  }
  return { points: 0, completedFocusSessions: 0 };
}

function generateRoomCode() {
  return generateUniqueRoomCode(new Set(communityState.rooms.map(function (room) {
    return room.code;
  })));
}

function getCommunityParticipant(participantId) {
  if (participantId === localParticipantId) {
    return {
      id: localParticipantId,
      name: communityState.participantName,
      points: score.points,
      isCurrent: true
    };
  }
  const participant = demoParticipants.find(function (entry) {
    return entry.id === participantId;
  });
  return participant
    ? { id: participant.id, name: participant.name, points: participant.points, isCurrent: false }
    : null;
}

function getParticipantInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(function (part) {
    return part.charAt(0);
  }).join("").toUpperCase();
}

function renderRooms() {
  roomsList.replaceChildren();
  roomsEmptyState.hidden = communityState.rooms.length > 0;
  roomCount.textContent = String(communityState.rooms.length);

  communityState.rooms.forEach(function (room) {
    const item = document.createElement("li");
    item.className = "room-list-item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-select";
    button.dataset.roomCode = room.code;
    const isSelected = room.code === communityState.selectedRoomCode;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));

    const copy = document.createElement("span");
    copy.className = "room-select-copy";
    const name = document.createElement("strong");
    name.textContent = room.name;
    const details = document.createElement("span");
    details.textContent = room.code + " · " + room.participantIds.length + " participantes";
    const membership = document.createElement("span");
    membership.className = "room-membership";
    membership.textContent = room.participantIds.includes(localParticipantId) ? "Participando" : "Disponível";
    copy.append(name, details);
    button.append(copy, membership);
    item.append(button);
    roomsList.append(item);
  });
}

function renderRoomParticipants() {
  const room = communityState.rooms.find(function (entry) {
    return entry.code === communityState.selectedRoomCode;
  });
  roomMembersList.replaceChildren();
  roomMemberCount.textContent = room ? String(room.participantIds.length) : "0";
  selectedRoom.hidden = !room;
  membersEmptyState.hidden = Boolean(room);
  roomMembersList.hidden = !room;
  if (!room) {
    return;
  }

  selectedRoomName.textContent = room.name;
  selectedRoomCode.textContent = room.code;
  const participants = room.participantIds.map(getCommunityParticipant).filter(Boolean);
  participants.sort(function (first, second) {
    return second.points - first.points ||
      Number(second.isCurrent) - Number(first.isCurrent) ||
      first.name.localeCompare(second.name, "pt-BR");
  });

  participants.forEach(function (participant) {
    const item = document.createElement("li");
    item.className = "member-row";
    item.classList.toggle("is-current", participant.isCurrent);
    const avatar = document.createElement("span");
    avatar.className = "member-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = getParticipantInitials(participant.name);
    const copy = document.createElement("span");
    copy.className = "member-copy";
    const name = document.createElement("strong");
    name.textContent = participant.name;
    const caption = document.createElement("span");
    caption.textContent = participant.isCurrent ? "Participante atual neste navegador" : "Participante fictício";
    const points = document.createElement("span");
    points.className = "member-points";
    points.textContent = participant.points + " pts";
    copy.append(name, caption);
    item.append(avatar, copy);
    if (participant.isCurrent) {
      const currentBadge = document.createElement("span");
      currentBadge.className = "current-badge";
      currentBadge.textContent = "Você";
      item.append(currentBadge);
    }
    item.append(points);
    roomMembersList.append(item);
  });
}

function renderCommunity() {
  participantNameInput.value = communityState.participantName;
  window.hubUpdateStudentProfile(communityState.participantName);
  renderRooms();
  renderRoomParticipants();
}

createRoomForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const roomNameInput = createRoomForm.elements.roomName;
  roomNameInput.value = roomNameInput.value.trim();
  if (!createRoomForm.reportValidity()) {
    return;
  }
  const room = {
    code: generateRoomCode(),
    name: roomNameInput.value,
    participantIds: demoParticipants.map(function (participant) {
      return participant.id;
    })
  };
  communityState.rooms.push(room);
  communityState.selectedRoomCode = room.code;
  const saved = saveCommunityState();
  createRoomForm.reset();
  renderCommunity();
  showCommunityFeedback(
    saved
      ? "Sala criada neste navegador. Código: " + room.code + ". Informe o código para participar."
      : "Sala criada nesta sessão, mas não foi possível salvá-la neste navegador.",
    !saved
  );
});

roomCodeInput.addEventListener("input", function () {
  roomCodeInput.value = roomCodeInput.value.toUpperCase();
});

joinRoomForm.addEventListener("submit", function (event) {
  event.preventDefault();
  roomCodeInput.value = roomCodeInput.value.trim().toUpperCase();
  if (!joinRoomForm.reportValidity()) {
    return;
  }
  const room = communityState.rooms.find(function (entry) {
    return entry.code === roomCodeInput.value;
  });
  if (!room) {
    showCommunityFeedback("Não encontramos esse código entre as salas salvas neste navegador.", true);
    return;
  }
  const alreadyParticipating = room.participantIds.includes(localParticipantId);
  if (!alreadyParticipating) {
    room.participantIds.push(localParticipantId);
  }
  communityState.selectedRoomCode = room.code;
  const saved = saveCommunityState();
  joinRoomForm.reset();
  renderCommunity();
  showCommunityFeedback(
    saved
      ? (alreadyParticipating ? "Você já participa desta sala. Ela foi aberta." : "Você entrou na sala " + room.code + ".")
      : "Sala aberta nesta sessão, mas não foi possível salvar a participação.",
    !saved
  );
});

participantNameForm.addEventListener("submit", function (event) {
  event.preventDefault();
  participantNameInput.value = participantNameInput.value.trim();
  if (!participantNameForm.reportValidity()) {
    return;
  }
  communityState.participantName = participantNameInput.value;
  const saved = saveCommunityState();
  renderCommunity();
  showCommunityFeedback(
    saved ? "Nome local atualizado." : "Nome atualizado nesta sessão, mas não foi possível salvá-lo neste navegador.",
    !saved
  );
});

roomsList.addEventListener("click", function (event) {
  const roomButton = event.target.closest("button[data-room-code]");
  if (!roomButton) {
    return;
  }
  const room = communityState.rooms.find(function (entry) {
    return entry.code === roomButton.dataset.roomCode;
  });
  if (!room) {
    showCommunityFeedback("Esta sala não está mais disponível nos dados locais.", true);
    return;
  }
  communityState.selectedRoomCode = room.code;
  const saved = saveCommunityState();
  renderCommunity();
  showCommunityFeedback(
    saved ? "Sala " + room.code + " selecionada." : "Sala aberta nesta sessão, mas não foi possível salvar a seleção.",
    !saved
  );
});

communityState = loadCommunityState();
score = loadScore();
renderCommunity();
