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

/* =====================================
   GAME DATA
===================================== */

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const gameId = getQueryParam("id");

if (!gameId) {
  document.body.innerHTML = "<h2>No game selected.</h2>";
  throw new Error("No game ID provided in URL");
}

let teamA = "";
let teamB = "";

let playersA = {};
let playersB = {};

let selectedPlayer = null;

/* =====================================
   ACTIONS
===================================== */

const actions = [
  { label: "🏀 3 Made", value: "points_3" },
  { label: "🏀 2 Made", value: "points_2" },

  { label: "🏀 1 Made", value: "points_1" },
  { label: "🧱 1 Miss", value: "miss_1" },

  { label: "🧱 3 Miss", value: "miss_3" },
  { label: "🧱 2 Miss", value: "miss_2" },

  { label: "🪄 Assist", value: "assists" },
  { label: "💪 Off Reb", value: "rebounds_off" },

  { label: "🛡️ Def Reb", value: "rebounds_def" },
  { label: "🥷 Steal", value: "steals" },

  { label: "⛔ TO", value: "turnovers" },
  { label: "🏐 Block", value: "blocks" },
];

/* =====================================
   TEAM INFORMATION
===================================== */

onValue(ref(db, `games/${gameId}/gameInfo`), (snap) => {
  const info = snap.val();

  if (!info) return;

  teamA = info.teamA;
  teamB = info.teamB;

  document.getElementById("teamA_name").innerHTML = `
    <img src="team_logo/${info.teamA_logo || ""}"
         class="teamLogo"
         alt="${teamA}">
    <span class="team-title">
        <span>${teamA}</span>
        <span class="team-score">${Number(info.scoreA || 0)}</span>
    </span>
`;

  document.getElementById("teamB_name").innerHTML = `
    <img src="team_logo/${info.teamB_logo || ""}"
         class="teamLogo"
         alt="${teamB}">
    <span class="team-title">
        <span>${teamB}</span>
        <span class="team-score">${Number(info.scoreB || 0)}</span>
    </span>
`;

  // Učitavanje igrača pokrećemo samo jednom
  if (!playersListenersStarted) {
    playersListenersStarted = true;
    loadPlayers();
  }
});

let playersListenersStarted = false;

/* =====================================
   LOAD PLAYERS
===================================== */

function loadPlayers() {
  onValue(ref(db, `games/${gameId}/teams/${teamA}/players`), (snap) => {
    playersA = snap.val() || {};

    renderTeamPlayers(playersA, "teamA_players", teamA);

    updateSelectedPlayer();
  });

  onValue(ref(db, `games/${gameId}/teams/${teamB}/players`), (snap) => {
    playersB = snap.val() || {};

    renderTeamPlayers(playersB, "teamB_players", teamB);

    updateSelectedPlayer();
  });
}

/* =====================================
   RENDER TEAM PLAYERS
===================================== */

function renderTeamPlayers(players, boxId, team) {
  const box = document.getElementById(boxId);

  box.innerHTML = "";

  const sortedPlayers = Object.entries(players).sort(
    (a, b) => Number(a[1].number) - Number(b[1].number),
  );

  sortedPlayers.forEach(([playerId, player]) => {
    const div = document.createElement("div");

    div.className = "playerBox";

    if (
      selectedPlayer &&
      selectedPlayer.playerId === playerId &&
      selectedPlayer.team === team
    ) {
      div.classList.add("selected");
    }

    const playerHeader = document.createElement("div");
    playerHeader.className = "player-header";

    const img = document.createElement("img");

    img.src = `team_logo/${player.photo || "default_player.png"}`;
    img.alt = player.name;
    img.className = "player-img";

    img.onerror = function () {
      this.onerror = null;
      this.src = "team_logo/default_player.png";
    };

    const name = document.createElement("strong");

    name.textContent = `${player.name} #${player.number}`;

    playerHeader.appendChild(img);
    playerHeader.appendChild(name);

    div.appendChild(playerHeader);

    // Klik na igrača
    div.addEventListener("click", () => {
      selectPlayer(team, playerId);
    });

    box.appendChild(div);
  });
}

/* =====================================
   SELECT PLAYER
===================================== */

function selectPlayer(team, playerId) {
  selectedPlayer = {
    team,
    playerId,
  };

  renderTeamPlayers(playersA, "teamA_players", teamA);

  renderTeamPlayers(playersB, "teamB_players", teamB);

  updateSelectedPlayer();
}

/* =====================================
   GET SELECTED PLAYER
===================================== */

function getSelectedPlayerData() {
  if (!selectedPlayer) return null;

  const players = selectedPlayer.team === teamA ? playersA : playersB;

  return players[selectedPlayer.playerId] || null;
}

/* =====================================
   UPDATE SELECTED PLAYER
===================================== */

async function updateSelectedPlayer() {
  const container = document.getElementById("selectedPlayer");
  const actionsContainer = document.getElementById("playerActions");

  if (!selectedPlayer) {
    container.innerHTML = `
            <div class="emptySelection">
                <div class="emptyIcon">🏀</div>

                <h2>Izaberi igrača</h2>

                <p>
                    Klikni na igrača iz Lions ili Dragons
                    tima da bi uneo njegovu statistiku.
                </p>
            </div>
        `;

    actionsContainer.style.display = "none";

    return;
  }

  const player = getSelectedPlayerData();

  if (!player) return;

  const statsRef = ref(
    db,
    `games/${gameId}/teams/${selectedPlayer.team}/players/${selectedPlayer.playerId}/stats`,
  );

  const statsSnap = await get(statsRef);

  // Sprečava da sporiji Firebase odgovor prikaže pogrešnog igrača
  const requestedPlayer = selectedPlayer;
  const stats = statsSnap.val() || {};

  if (
    !selectedPlayer ||
    selectedPlayer.playerId !== requestedPlayer.playerId ||
    selectedPlayer.team !== requestedPlayer.team
  ) {
    return;
  }

  const totalRebounds =
    Number(stats.rebounds_off || 0) + Number(stats.rebounds_def || 0);

  container.innerHTML = `
        <div class="selected-player-header">
        <img
            src="team_logo/${player.photo || "default_player.png"}"
            class="selected-player-img"
            alt="${player.name}"
            onerror="this.onerror=null;this.src='team_logo/default_player.png';"
        >

        <div class="selected-player-info">
            <h2>${player.name} #${player.number}</h2>
            <p>${selectedPlayer.team}</p>
        </div>

        <div class="selected-player-stats">
            <div class="stat-item">
                <strong>${stats.points || 0}</strong>
                <span>PTS</span>
            </div>

            <div class="stat-item">
                <strong>${totalRebounds}</strong>
                <span>REB</span>
            </div>

            <div class="stat-item">
                <strong>${stats.assists || 0}</strong>
                <span>AST</span>
            </div>
        </div>
    </div>
`;

  // Prikaz akcija
  renderActions();

  actionsContainer.style.display = "block";
}

/* =====================================
   RENDER ACTION BUTTONS
===================================== */

function renderActions() {
  const container = document.getElementById("playerActions");

  container.innerHTML = "";

  const actionsDiv = document.createElement("div");

  actionsDiv.className = "actions";

  actions.forEach((action) => {
    const btn = document.createElement("button");

    btn.className = "actionBtn";

    btn.textContent = action.label;

    btn.addEventListener("click", () => {
      if (!selectedPlayer) return;

      applyAction(selectedPlayer.team, selectedPlayer.playerId, action.value);
    });

    actionsDiv.appendChild(btn);
  });

  container.appendChild(actionsDiv);
}

/* =====================================
   APPLY ACTION
===================================== */

async function applyAction(team, playerId, action) {
  const players = team === teamA ? playersA : playersB;
  const player = players[playerId];

  if (!player) return;

  const playerName = player.name;
  const playerPhoto = player.photo || "default_player.png";

  const playerStatsRef = ref(
    db,
    `games/${gameId}/teams/${team}/players/${playerId}/stats`,
  );

  const teamStatsRef = ref(db, `games/${gameId}/teams/${team}/team_stats`);

  const gameInfoRef = ref(db, `games/${gameId}/gameInfo`);

  const playerUpdates = {};
  const teamUpdates = {};
  const gameUpdates = {};

  function addStat(stat, amount = 1) {
    playerUpdates[stat] = increment(amount);
    teamUpdates[stat] = increment(amount);
  }

  function made(points) {
    addStat("points", points);

    if (points === 1) {
      addStat("ft_made");
      addStat("ft_attempts");
    } else if (points === 2) {
      addStat("two_made");
      addStat("two_attempts");
      addStat("fg_made");
      addStat("fg_attempts");
    } else if (points === 3) {
      addStat("three_made");
      addStat("three_attempts");
      addStat("fg_made");
      addStat("fg_attempts");
    }

    if (team === teamA) {
      gameUpdates.scoreA = increment(points);
    } else {
      gameUpdates.scoreB = increment(points);
    }
  }

  if (action.startsWith("points_")) {
    const points = parseInt(action.split("_")[1]);

    made(points);
  } else if (action.startsWith("miss_")) {
    const points = parseInt(action.split("_")[1]);

    if (points === 1) {
      addStat("ft_attempts");
    } else if (points === 2) {
      addStat("two_attempts");
      addStat("fg_attempts");
    } else if (points === 3) {
      addStat("three_attempts");
      addStat("fg_attempts");
    }
  } else if (action === "assists") {
    addStat("assists");
  } else if (action === "rebounds_off") {
    addStat("rebounds_off");
  } else if (action === "rebounds_def") {
    addStat("rebounds_def");
  } else if (action === "steals") {
    addStat("steals");
  } else if (action === "turnovers") {
    addStat("turnovers");
  } else if (action === "blocks") {
    addStat("blocks");
  } else {
    return;
  }

  try {
    await update(playerStatsRef, playerUpdates);
    await update(teamStatsRef, teamUpdates);

    if (Object.keys(gameUpdates).length) {
      await update(gameInfoRef, gameUpdates);
    }

    const timestamp = Date.now();

    await push(ref(db, `games/${gameId}/events`), {
      player: playerId,
      playerName,
      playerPhoto,
      team,
      type: action,
      timestamp,
    });

    if (action.startsWith("points_")) {
      const updatedSnap = await get(playerStatsRef);

      await update(ref(db, `games/${gameId}/lastScore`), {
        player: playerId,
        playerName,
        team,
        points: parseInt(action.split("_")[1]),
        shotType:
          action === "points_1" ? "FT" : action === "points_2" ? "2PT" : "3PT",
        timestamp,
        stats: updatedSnap.val() || {},
      });
    }

    showNotification(getActionNotification(action, playerName), playerPhoto);

    // Osvežavanje statistike selektovanog igrača
    if (
      selectedPlayer &&
      selectedPlayer.team === team &&
      selectedPlayer.playerId === playerId
    ) {
      updateSelectedPlayer();
    }
  } catch (error) {
    console.error("Error applying action:", error);

    showNotification("Greška prilikom čuvanja statistike");
  }
}

/* =====================================
   ACTION NOTIFICATIONS
===================================== */

function getActionNotification(action, playerName) {
  const messages = {
    points_2: "Pogodio šut za 2 poena",
    points_3: "Pogodio šut za 3 poena",
    points_1: "Pogodio slobodno bacanje",

    miss_2: "Promašio šut za 2 poena",
    miss_3: "Promašio šut za 3 poena",
    miss_1: "Promašio slobodno bacanje",

    assists: "Asistencija",
    rebounds_off: "Skok u napadu",
    rebounds_def: "Skok u odbrani",
    steals: "Ukradena lopta",
    turnovers: "Izgubljena lopta",
    blocks: "Blokada",
  };

  return `${playerName} – ${messages[action] || action}`;
}

/* =====================================
   NOTIFICATION
===================================== */

function showNotification(message, photo = "") {
  const notification = document.createElement("div");

  Object.assign(notification.style, {
    position: "fixed",
    top: "15px",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "auto",
    right: "auto",
    background: "linear-gradient(135deg, #315b80 0%, #172b43 100%)",
    color: "#ffffff",
    padding: "12px 20px",
    border: "1px solid #315b80",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "700",
    boxShadow: "0 5px 15px rgba(23,43,67,0.25)",
    opacity: "0",
    transition: "opacity 0.3s ease",
    zIndex: "99999",
    display: "flex",
    alignItems: "center",
    gap: "12px",

    width: "max-content",
    maxWidth: "90vw",
    boxSizing: "border-box",
  });

  const img = document.createElement("img");

  img.src = `team_logo/${photo || "default_player.png"}`;
  img.alt = "Player";

  Object.assign(img.style, {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: "0",
  });

  notification.style.setProperty("position", "fixed", "important");
  notification.style.setProperty("top", "15px", "important");
  notification.style.setProperty("left", "50%", "important");
  notification.style.setProperty("bottom", "auto", "important");
  notification.style.setProperty("right", "auto", "important");
  notification.style.setProperty("transform", "translateX(-50%)", "important");

  img.onerror = function () {
    this.onerror = null;
    this.src = "team_logo/default_player.png";
  };

  notification.appendChild(img);

  const text = document.createElement("span");
  text.textContent = message;
  notification.appendChild(text);

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
  });

  setTimeout(() => {
    notification.style.opacity = "0";

    notification.addEventListener(
      "transitionend",
      () => notification.remove(),
      { once: true },
    );
  }, 4000);
}

/* =====================================
   UNDO LAST PLAY
===================================== */

async function undoLastPlay() {
  try {
    const eventsSnap = await get(ref(db, `games/${gameId}/events`));

    const events = eventsSnap.val();

    if (!events) {
      showNotification("Nema poslednjih akcija");
      return;
    }

    let lastKey = null;
    let lastTimestamp = -1;

    for (const key in events) {
      const timestamp = Number(events[key].timestamp || 0);

      if (timestamp >= lastTimestamp) {
        lastTimestamp = timestamp;
        lastKey = key;
      }
    }

    if (!lastKey) {
      showNotification("Nema poslednjih akcija");
      return;
    }

    const lastEvent = events[lastKey];

    const { player, playerName, playerPhoto, team, type } = lastEvent;

    const playerStatsRef = ref(
      db,
      `games/${gameId}/teams/${team}/players/${player}/stats`,
    );

    const teamStatsRef = ref(db, `games/${gameId}/teams/${team}/team_stats`);

    const gameInfoRef = ref(db, `games/${gameId}/gameInfo`);

    const playerUpdates = {};
    const teamUpdates = {};
    const gameUpdates = {};

    function subtractStat(stat, amount = 1) {
      playerUpdates[stat] = increment(-amount);
      teamUpdates[stat] = increment(-amount);
    }

    function subtractMade(points) {
      subtractStat("points", points);

      if (points === 1) {
        subtractStat("ft_made");
        subtractStat("ft_attempts");
      } else if (points === 2) {
        subtractStat("two_made");
        subtractStat("two_attempts");
        subtractStat("fg_made");
        subtractStat("fg_attempts");
      } else if (points === 3) {
        subtractStat("three_made");
        subtractStat("three_attempts");
        subtractStat("fg_made");
        subtractStat("fg_attempts");
      }

      if (team === teamA) {
        gameUpdates.scoreA = increment(-points);
      } else {
        gameUpdates.scoreB = increment(-points);
      }
    }

    if (type.startsWith("points_")) {
      subtractMade(parseInt(type.split("_")[1]));
    } else if (type.startsWith("miss_")) {
      const points = parseInt(type.split("_")[1]);

      if (points === 1) {
        subtractStat("ft_attempts");
      } else if (points === 2) {
        subtractStat("two_attempts");
        subtractStat("fg_attempts");
      } else if (points === 3) {
        subtractStat("three_attempts");
        subtractStat("fg_attempts");
      }
    } else if (type === "assists") {
      subtractStat("assists");
    } else if (type === "rebounds_off") {
      subtractStat("rebounds_off");
    } else if (type === "rebounds_def") {
      subtractStat("rebounds_def");
    } else if (type === "steals") {
      subtractStat("steals");
    } else if (type === "turnovers") {
      subtractStat("turnovers");
    } else if (type === "blocks") {
      subtractStat("blocks");
    }

    // Uklanjanje poslednjeg događaja
    await remove(ref(db, `games/${gameId}/events/${lastKey}`));

    if (Object.keys(playerUpdates).length) {
      await update(playerStatsRef, playerUpdates);
    }

    if (Object.keys(teamUpdates).length) {
      await update(teamStatsRef, teamUpdates);
    }

    if (Object.keys(gameUpdates).length) {
      await update(gameInfoRef, gameUpdates);
    }

    // Reset poslednjeg poena samo ako je poništena akcija šuta
    if (type.startsWith("points_")) {
      await update(ref(db, `games/${gameId}/lastScore`), {
        player: null,
        playerName: null,
        team: null,
        points: 0,
        shotType: null,
        stats: {},
        timestamp: 0,
      });
    }

    const actionDescription = getActionNotification(type, playerName);

    showNotification(`Poništena akcija: ${actionDescription}`, playerPhoto);

    updateSelectedPlayer();
  } catch (error) {
    console.error("Undo error:", error);

    showNotification("Greška prilikom Undo akcije");
  }
}

/* =====================================
   FINISH GAME
===================================== */

async function finishGame() {
  const confirmed = confirm("Da li sigurno želiš da završiš utakmicu?");

  if (!confirmed) return;

  try {
    await update(ref(db, `games/${gameId}/gameInfo`), {
      status: "finished",
    });

    showNotification("Utakmica je uspešno završena!");
  } catch (error) {
    console.error("Finish game error:", error);

    showNotification("Greška prilikom završavanja utakmice");
  }
}

/* =====================================
   BUTTON EVENTS
===================================== */

document.getElementById("undoBtn").addEventListener("click", undoLastPlay);

document.getElementById("finishBtn").addEventListener("click", finishGame);
