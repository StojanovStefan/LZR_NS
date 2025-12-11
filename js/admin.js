import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  increment,
  push,
  get,
  remove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBrMu0mjZw1SIh-0KgEVaKoPURdN1PhC0w",
  authDomain: "kk-panthers-39d91.firebaseapp.com",
  databaseURL:
    "https://kk-panthers-39d91-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "kk-panthers-39d91",
  storageBucket: "kk-panthers-39d91.appspot.com",
  messagingSenderId: "605710897252",
  appId: "1:605710897252:web:9469a8022065af45748f71",
  measurementId: "G-KL6BJPX04S",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const gameId = getQueryParam("id");
if (!gameId) {
  document.body.innerHTML = "<p>No game selected.</p>";
  throw new Error("No game ID provided in URL");
}

let teamA = "";
let teamB = "";

onValue(ref(db, `games/${gameId}/gameInfo`), (snap) => {
  const info = snap.val();
  if (!info) return;

  teamA = info.teamA;
  teamB = info.teamB;

  document.getElementById(
    "teamA_name"
  ).innerHTML = `<img src="team_logo/${info.teamA_logo}" class="teamLogo"><span>${teamA}</span>`;

  document.getElementById(
    "teamB_name"
  ).innerHTML = `<img src="team_logo/${info.teamB_logo}" class="teamLogo"><span>${teamB}</span>`;

  loadPlayers();
});

function loadPlayers() {
  if (teamA) loadTeamPlayers(teamA, "teamA_players");
  if (teamB) loadTeamPlayers(teamB, "teamB_players");
}

function loadTeamPlayers(team, boxId) {
  onValue(ref(db, `games/${gameId}/teams/${team}/players`), (snap) => {
    const players = snap.val() || {};
    const box = document.getElementById(boxId);
    box.innerHTML = "";

    const sortedPlayers = Object.entries(players).sort((a, b) => {
      return a[1].number - b[1].number;
    });

    sortedPlayers.forEach(([playerId, p]) => {
      const div = document.createElement("div");
      div.className = "playerBox";
      div.innerHTML = `<strong>${p.name}</strong> (#${p.number})`;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "actions";

      const actions = [
        { label: "2 Miss", value: "miss_2" },
        { label: "2 Made", value: "points_2" },
        { label: "3 Miss", value: "miss_3" },
        { label: "3 Made", value: "points_3" },
        { label: "1 Miss", value: "miss_1" },
        { label: "1 Made", value: "points_1" },
        { label: "Assist", value: "assists" },
        { label: "Off Reb", value: "rebounds_off" },
        { label: "Def Reb", value: "rebounds_def" },
        { label: "Steal", value: "steals" },
        { label: "TO", value: "turnovers" },
        { label: "Block", value: "blocks" },
      ];

      actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.className = "actionBtn";
        btn.textContent = a.label;
        btn.onclick = () => applyAction(team, playerId, a.value, p.name);
        actionsDiv.appendChild(btn);
      });

      div.appendChild(actionsDiv);
      box.appendChild(div);
    });
  });
}

async function applyAction(team, player, action, playerName = "") {
  const playerStatsRef = ref(
    db,
    `games/${gameId}/teams/${team}/players/${player}/stats`
  );
  const teamStatsRef = ref(db, `games/${gameId}/teams/${team}/team_stats`);
  const gameInfoRef = ref(db, `games/${gameId}/gameInfo`);

  let playerUpdates = {};
  let teamUpdates = {};
  let gameUpdates = {};

  function made(pts) {
    playerUpdates.points = increment(pts);
    teamUpdates.points = increment(pts);

    if (pts === 1) {
      playerUpdates.ft_made = increment(1);
      playerUpdates.ft_attempts = increment(1);
      teamUpdates.ft_made = increment(1);
      teamUpdates.ft_attempts = increment(1);
    } else if (pts === 2) {
      playerUpdates.two_made = increment(1);
      playerUpdates.two_attempts = increment(1);
      playerUpdates.fg_made = increment(1);
      playerUpdates.fg_attempts = increment(1);
      teamUpdates.two_made = increment(1);
      teamUpdates.two_attempts = increment(1);
      teamUpdates.fg_made = increment(1);
      teamUpdates.fg_attempts = increment(1);
    } else if (pts === 3) {
      playerUpdates.three_made = increment(1);
      playerUpdates.three_attempts = increment(1);
      playerUpdates.fg_made = increment(1);
      playerUpdates.fg_attempts = increment(1);
      teamUpdates.three_made = increment(1);
      teamUpdates.three_attempts = increment(1);
      teamUpdates.fg_made = increment(1);
      teamUpdates.fg_attempts = increment(1);
    }

    if (team === teamA) gameUpdates.scoreA = increment(pts);
    else gameUpdates.scoreB = increment(pts);
  }

  if (action.startsWith("points_")) {
    const pts = parseInt(action.split("_")[1]);
    made(pts);

    await update(playerStatsRef, playerUpdates);
    await update(teamStatsRef, teamUpdates);
    await update(gameInfoRef, gameUpdates);

    const updatedSnap = await get(playerStatsRef);
    const fullStats = updatedSnap.val() || {};

    await update(ref(db, `games/${gameId}/lastScore`), {
      player,
      playerName,
      team,
      points: pts,
      shotType: pts === 1 ? "FT" : pts === 2 ? "2PT" : "3PT",
      timestamp: Date.now(),
      stats: fullStats,
    });

    await push(ref(db, `games/${gameId}/events`), {
      player,
      playerName,
      team,
      type: action,
      timestamp: Date.now(),
    });

    return;
  } else if (action.startsWith("miss_")) {
    const m = parseInt(action.split("_")[1]);
    if (m === 1) {
      playerUpdates.ft_attempts = increment(1);
      teamUpdates.ft_attempts = increment(1);
    } else if (m === 2) {
      playerUpdates.two_attempts = increment(1);
      playerUpdates.fg_attempts = increment(1);
      teamUpdates.two_attempts = increment(1);
      teamUpdates.fg_attempts = increment(1);
    } else if (m === 3) {
      playerUpdates.three_attempts = increment(1);
      playerUpdates.fg_attempts = increment(1);
      teamUpdates.three_attempts = increment(1);
      teamUpdates.fg_attempts = increment(1);
    }
  } else if (action === "assists") {
    playerUpdates.assists = increment(1);
    teamUpdates.assists = increment(1);
  } else if (action === "rebounds_off") {
    playerUpdates.rebounds_off = increment(1);
    teamUpdates.rebounds_off = increment(1);
  } else if (action === "rebounds_def") {
    playerUpdates.rebounds_def = increment(1);
    teamUpdates.rebounds_def = increment(1);
  } else if (action === "steals") {
    playerUpdates.steals = increment(1);
    teamUpdates.steals = increment(1);
  } else if (action === "turnovers") {
    playerUpdates.turnovers = increment(1);
    teamUpdates.turnovers = increment(1);
  } else if (action === "blocks") {
    playerUpdates.blocks = increment(1);
    teamUpdates.blocks = increment(1);
  }

  await update(playerStatsRef, playerUpdates);
  await update(teamStatsRef, teamUpdates);

  await push(ref(db, `games/${gameId}/events`), {
    player,
    playerName,
    team,
    type: action,
    timestamp: Date.now(),
  });
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;

  notification.style.position = "fixed";
  notification.style.bottom = "90px";
  notification.style.left = "30px";
  notification.style.background = "#fbbf24";
  notification.style.color = "black";
  notification.style.padding = "12px 20px";
  notification.style.borderRadius = "8px";
  notification.style.fontSize = "16px";
  notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.25)";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 0.3s ease";
  notification.style.zIndex = "9999";

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
  });

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.addEventListener("transitionend", () => {
      notification.remove();
    });
  }, 5000);
}

async function undoLastPlay() {
  const eventsSnap = await get(ref(db, `games/${gameId}/events`));
  const events = eventsSnap.val();
  if (!events) {
    return showNotification("Nema poslednjih akcija");
  }

  let lastKey = null;
  let lastTimestamp = 0;
  for (const key in events) {
    if (events[key].timestamp > lastTimestamp) {
      lastTimestamp = events[key].timestamp;
      lastKey = key;
    }
  }
  if (!lastKey) {
    return showNotification("Nema poslednjih akcija");
  }

  const lastEvent = events[lastKey];
  const { player, playerName, team, type } = lastEvent;
  const playerStatsRef = ref(
    db,
    `games/${gameId}/teams/${team}/players/${player}/stats`
  );
  const teamStatsRef = ref(db, `games/${gameId}/teams/${team}/team_stats`);
  const gameInfoRef = ref(db, `games/${gameId}/gameInfo`);

  let playerUpdates = {};
  let teamUpdates = {};
  let gameUpdates = {};

  if (type.startsWith("points_")) {
    const pts = parseInt(type.split("_")[1]);
    playerUpdates.points = increment(-pts);
    teamUpdates.points = increment(-pts);
    if (pts === 1) {
      playerUpdates.ft_made = increment(-1);
      playerUpdates.ft_attempts = increment(-1);
      teamUpdates.ft_made = increment(-1);
      teamUpdates.ft_attempts = increment(-1);
    }
    if (pts === 2) {
      playerUpdates.two_made = increment(-1);
      playerUpdates.two_attempts = increment(-1);
      playerUpdates.fg_made = increment(-1);
      playerUpdates.fg_attempts = increment(-1);
      teamUpdates.two_made = increment(-1);
      teamUpdates.two_attempts = increment(-1);
      teamUpdates.fg_made = increment(-1);
      teamUpdates.fg_attempts = increment(-1);
    }
    if (pts === 3) {
      playerUpdates.three_made = increment(-1);
      playerUpdates.three_attempts = increment(-1);
      playerUpdates.fg_made = increment(-1);
      playerUpdates.fg_attempts = increment(-1);
      teamUpdates.three_made = increment(-1);
      teamUpdates.three_attempts = increment(-1);
      teamUpdates.fg_made = increment(-1);
      teamUpdates.fg_attempts = increment(-1);
    }
    if (team === teamA) gameUpdates.scoreA = increment(-pts);
    else gameUpdates.scoreB = increment(-pts);
  } else if (type.startsWith("miss_")) {
    const m = parseInt(type.split("_")[1]);
    if (m === 1) {
      playerUpdates.ft_attempts = increment(-1);
      teamUpdates.ft_attempts = increment(-1);
    }
    if (m === 2) {
      playerUpdates.two_attempts = increment(-1);
      playerUpdates.fg_attempts = increment(-1);
      teamUpdates.two_attempts = increment(-1);
      teamUpdates.fg_attempts = increment(-1);
    }
    if (m === 3) {
      playerUpdates.three_attempts = increment(-1);
      playerUpdates.fg_attempts = increment(-1);
      teamUpdates.three_attempts = increment(-1);
      teamUpdates.fg_attempts = increment(-1);
    }
  } else if (type === "assists") {
    playerUpdates.assists = increment(-1);
    teamUpdates.assists = increment(-1);
  } else if (type === "rebounds_off") {
    playerUpdates.rebounds_off = increment(-1);
    teamUpdates.rebounds_off = increment(-1);
  } else if (type === "rebounds_def") {
    playerUpdates.rebounds_def = increment(-1);
    teamUpdates.rebounds_def = increment(-1);
  } else if (type === "steals") {
    playerUpdates.steals = increment(-1);
    teamUpdates.steals = increment(-1);
  } else if (type === "turnovers") {
    playerUpdates.turnovers = increment(-1);
    teamUpdates.turnovers = increment(-1);
  } else if (type === "blocks") {
    playerUpdates.blocks = increment(-1);
    teamUpdates.blocks = increment(-1);
  }

  await remove(ref(db, `games/${gameId}/events/${lastKey}`));

  if (Object.keys(playerUpdates).length)
    await update(playerStatsRef, playerUpdates);

  if (Object.keys(teamUpdates).length) await update(teamStatsRef, teamUpdates);

  if (Object.keys(gameUpdates).length) await update(gameInfoRef, gameUpdates);

  const lastScoreRef = ref(db, `games/${gameId}/lastScore`);
  await update(lastScoreRef, {
    player: null,
    playerName: null,
    team: null,
    points: 0,
    shotType: null,
    stats: {},
    timestamp: 0,
  });

  let actionText = "";
  switch (type) {
    case "points_2":
      actionText = "pogađa šut za dva poena";
      break;
    case "miss_2":
      actionText = "promašuje šut za dva poena";
      break;
    case "points_3":
      actionText = " pogađa šut za tri poena";
      break;
    case "miss_3":
      actionText = "promašuje šut za tri poena";
      break;
    case "points_1":
      actionText = "pogađa šut za jedan poen";
      break;
    case "miss_1":
      actionText = "promašuje šut za jedan poen";
      break;
    case "assists":
      actionText = "Asistira";
      break;
    case "rebounds_def":
      actionText = "Skok u odbrani";
      break;
    case "rebounds_off":
      actionText = "Skok u napadu";
      break;
    case "steals":
      actionText = "osvaja loptu";
      break;
    case "turnovers":
      actionText = "gubi loptu";
      break;
    case "blocks":
      actionText = "Blokada";
      break;
    default:
      actionText = type;
  }

  showNotification(`Poslednja akcija poništena: ${playerName} - ${actionText}`);
}

document.getElementById("undoBtn").addEventListener("click", undoLastPlay);

async function finishGame() {
  const gameInfoRef = ref(db, `games/${gameId}/gameInfo`);

  await update(gameInfoRef, { status: "finished" });

  showNotification("Utakmica je uspešno završena!");
}

document.getElementById("finishBtn").addEventListener("click", finishGame);
