const rankingList = document.querySelector("#ranking-list");
const rankingCommunityKey = "hub-estudos:community:v1";
const rankingScoreKey = "hub-estudos:score:v1";
const rankingParticipants = [
  { id: "demo-1", name: "Marina Alves", points: 375 },
  { id: "demo-2", name: "Lucas Costa", points: 250 },
  { id: "demo-3", name: "Bia Santos", points: 150 }
];

function getRankingName() {
  try {
    const savedCommunity = window.localStorage.getItem(rankingCommunityKey);
    if (savedCommunity !== null) {
      const community = JSON.parse(savedCommunity);
      if (community && typeof community.participantName === "string" && community.participantName.trim()) {
        return community.participantName === "Hub de Estudos" ? "ISA" : community.participantName;
      }
    }
  } catch (error) {
    return "ISA";
  }
  return "ISA";
}

function getRankingScore() {
  try {
    const savedScore = window.localStorage.getItem(rankingScoreKey);
    if (savedScore !== null) {
      const score = JSON.parse(savedScore);
      if (
        score &&
        Number.isSafeInteger(score.points) &&
        Number.isSafeInteger(score.completedFocusSessions) &&
        score.points >= 0 &&
        score.completedFocusSessions >= 0 &&
        score.points === score.completedFocusSessions * 25
      ) {
        return score.points;
      }
    }
  } catch (error) {
    return 0;
  }
  return 0;
}

function renderRanking() {
  const participants = [{
    id: "local",
    name: getRankingName(),
    points: getRankingScore(),
    isCurrent: true
  }].concat(rankingParticipants.map(function (participant) {
    return {
      id: participant.id,
      name: participant.name,
      points: participant.points,
      isCurrent: false
    };
  }));
  participants.sort(function (first, second) {
    return second.points - first.points ||
      Number(second.isCurrent) - Number(first.isCurrent) ||
      first.name.localeCompare(second.name, "pt-BR");
  });

  rankingList.replaceChildren();
  participants.forEach(function (participant, index) {
    const item = document.createElement("li");
    item.className = "ranking-row";
    if (index < 3) {
      item.classList.add(["rank-first", "rank-second", "rank-third"][index]);
    }
    if (participant.isCurrent) {
      item.classList.add("is-current");
    }
    const position = document.createElement("span");
    position.className = "ranking-position";
    position.textContent = String(index + 1);
    const participantCell = document.createElement("span");
    participantCell.className = "ranking-participant";
    const name = document.createElement("span");
    name.className = "ranking-name";
    name.textContent = participant.name;
    participantCell.append(name);
    const badge = document.createElement("span");
    badge.className = participant.isCurrent ? "current-badge" : "ranking-demo-label";
    badge.textContent = participant.isCurrent ? "Você" : "Demonstração";
    participantCell.append(badge);
    const points = document.createElement("span");
    points.className = "ranking-points";
    points.textContent = participant.points + " pts";
    item.append(position, participantCell, points);
    rankingList.append(item);
  });
}

renderRanking();
