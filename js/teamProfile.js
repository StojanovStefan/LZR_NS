import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
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
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const urlParams = new URLSearchParams(window.location.search);
const teamID = urlParams.get("id");
const teamContainer = document.getElementById("teamContainer");
const statsGrid = document.getElementById("statsGrid");
const playersTable = document.getElementById("playersTable");
const gamesList = document.getElementById("gamesList");
const playersList = document.getElementById("playersList");

const btnT = document.getElementById("btnTotals");
const btnP = document.getElementById("btnPlayers");
const btnTimeline = document.getElementById("btnTimeline");

function resetSortingUI() {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".stat-box.active-stat").forEach((box) => {
    box.classList.remove("active-stat");
  });

  currentSort.key = null;
  currentSort.direction = "desc";
}

btnT.onclick = () => {
  resetSortingUI();
  btnT.classList.add("active");
  btnP.classList.remove("active");
  btnTimeline.classList.remove("active");

  document.getElementById("teamTotals").style.display = "block";
  document.getElementById("playersSection").style.display = "none";
  document.getElementById("gamesSection").style.display = "none";
  document.getElementById("playersSortButtons").style.display = "none";
};

btnP.onclick = () => {
  resetSortingUI();
  btnP.classList.add("active");
  btnT.classList.remove("active");
  btnTimeline.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("playersSection").style.display = "block";
  document.getElementById("gamesSection").style.display = "none";
  document.getElementById("playersSortButtons").style.display = "flex";

  currentPlayersArray = Object.entries(currentPlayers);
  renderPlayers(currentPlayersArray);
};

btnTimeline.onclick = () => {
  resetSortingUI();
  btnTimeline.classList.add("active");
  btnP.classList.remove("active");
  btnT.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("playersSection").style.display = "none";
  document.getElementById("playersSortButtons").style.display = "none";
  document.getElementById("gamesSection").style.display = "block";
};

const teamRef = ref(db, "teams/" + teamID);
const gamesRef = ref(db, "games");
get(gamesRef).then((snapshot) => {
  if (!snapshot.exists()) {
    teamContainer.innerHTML = "<p>No games found.</p>";
    return;
  }

  const games = snapshot.val();
  let teamInfo = null;

  Object.values(games).some((game) => {
    const info = game.gameInfo || {};
    if (info.teamA === teamID) {
      teamInfo = {
        logo: info.teamA_logo,
        name: info.teamA,
        stats: game.teams?.[teamID]?.stats,
        players: game.teams?.[teamID]?.players,
      };
      return true;
    } else if (info.teamB === teamID) {
      teamInfo = {
        logo: info.teamB_logo,
        name: info.teamB,
        stats: game.teams?.[teamID]?.stats,
        players: game.teams?.[teamID]?.players,
      };
      return true;
    }
    return false;
  });

  if (!teamInfo) {
    teamContainer.innerHTML = "<p>Team not found in any games.</p>";
    return;
  }

  const logoPath = teamInfo.logo
    ? `team_logo/${teamInfo.logo}`
    : "team_logo/default.png";
  teamContainer.innerHTML = `<img src="${logoPath}" alt="${teamInfo.name}"><span>${teamInfo.name}</span>`;
});

function calculateTeamStats(games, teamID) {
  const totals = {
    fgA: 0,
    fgM: 0,
    twoA: 0,
    twoM: 0,
    threeA: 0,
    threeM: 0,
    ftA: 0,
    ftM: 0,
    orb: 0,
    drb: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    points: 0,
    gamesPlayed: 0,
  };

  Object.values(games).forEach((game) => {
    const team = game.teams?.[teamID];
    if (!team) return;

    totals.gamesPlayed++;

    Object.values(team.players || {}).forEach((p) => {
      const s = p.stats;

      totals.fgA += s.fg_attempts || 0;
      totals.fgM += s.fg_made || 0;

      totals.twoA += s.two_attempts || 0;
      totals.twoM += s.two_made || 0;

      totals.threeA += s.three_attempts || 0;
      totals.threeM += s.three_made || 0;

      totals.ftA += s.ft_attempts || 0;
      totals.ftM += s.ft_made || 0;

      totals.orb += s.rebounds_off || 0;
      totals.drb += s.rebounds_def || 0;

      totals.assists += s.assists || 0;
      totals.steals += s.steals || 0;
      totals.blocks += s.blocks || 0;
      totals.turnovers += s.turnovers || 0;

      totals.points += s.points || 0;
    });
  });

  return totals;
}

function renderTeamStats(totals) {
  const gp = totals.gamesPlayed || 1;

  const stats = [
    {
      title: "FG",
      avgA: (totals.fgA / gp).toFixed(1),
      avgM: (totals.fgM / gp).toFixed(1),
      totalA: totals.fgA,
      totalM: totals.fgM,
      percent: totals.fgA ? ((totals.fgM / totals.fgA) * 100).toFixed(2) : "0",
      labels: ["FGA", "FGM"],
      avgVals: [(totals.fgA / gp).toFixed(1), (totals.fgM / gp).toFixed(1)],
      totalVals: [totals.fgA, totals.fgM],
    },
    {
      title: "2P",
      labels: ["2PTA", "2PTM"],
      avgVals: [(totals.twoA / gp).toFixed(1), (totals.twoM / gp).toFixed(1)],
      totalVals: [totals.twoA, totals.twoM],
      percent: totals.twoA
        ? ((totals.twoM / totals.twoA) * 100).toFixed(2)
        : "0",
    },
    {
      title: "3P",
      labels: ["3PTA", "3PTM"],
      avgVals: [
        (totals.threeA / gp).toFixed(1),
        (totals.threeM / gp).toFixed(1),
      ],
      totalVals: [totals.threeA, totals.threeM],
      percent: totals.threeA
        ? ((totals.threeM / totals.threeA) * 100).toFixed(2)
        : "0",
    },
    /*{
            title: "FT",
            avgA: (totals.ftA / gp).toFixed(1),
            avgM: (totals.ftM / gp).toFixed(1),
            totalA: totals.ftA,
            totalM: totals.ftM,
            percent: totals.ftA
              ? ((totals.ftM / totals.ftA) * 100).toFixed(2)
              : "0",
          },*/

    {
      title: "REB O/D",
      labels: ["ORB", "DRB"],
      avgVals: [(totals.orb / gp).toFixed(1), (totals.drb / gp).toFixed(1)],
      totalVals: [totals.orb, totals.drb],
    },

    {
      title: "PTS",
      labels: [""],
      avgVals: [(totals.points / gp).toFixed(1)],
      totalVals: [totals.points],
    },
    {
      title: "AST",
      labels: [""],
      avgVals: [(totals.assists / gp).toFixed(1)],
      totalVals: [totals.assists],
    },
    {
      title: "TO",
      labels: [""],
      avgVals: [(totals.turnovers / gp).toFixed(1)],
      totalVals: [totals.turnovers],
    },
    {
      title: "STL",
      labels: [""],
      avgVals: [(totals.steals / gp).toFixed(1)],
      totalVals: [totals.steals],
    },
    /*{
            title: "BLK",
            avg: (totals.blocks / gp).toFixed(1),
            total: totals.blocks,
          },*/
  ];

  let rowsCombined = `
    <div class="stat-row header">
        <span>Prosečno</span>
        <span>Ukupno</span>
    </div>
`;

  stats.forEach((s) => {
    let rowsCombined = `
        <div class="stat-row header">
            <span>Prosečno</span>
            <span>Ukupno</span>
        </div>
    `;

    s.labels.forEach((label, i) => {
      rowsCombined += `
            <div class="stat-row">
                <span>${label}</span>
                <span>${label}</span>
            </div>
            <div class="stat-row">
                <span>${s.avgVals[i]}</span>
                <span>${s.totalVals[i]}</span>
            </div>
        `;
    });

    statsGrid.innerHTML += `
        <div class="stat-card">
            <h3>${s.title}</h3>

            <div class="stat-rows">
                ${rowsCombined}
            </div>

            ${s.percent ? `<div class="stat-percent">${s.percent}%</div>` : ""}
        </div>
    `;
  });
}

function renderTeamGames(games, teamID) {
  gamesList.innerHTML = "";
  const gameKeys = Object.keys(games);

  gameKeys.sort((a, b) => {
    const infoA = games[a].gameInfo;
    const infoB = games[b].gameInfo;

    const dateStrA = infoA?.date || a.split("_")[0];
    const dateStrB = infoB?.date || b.split("_")[0];

    const dateA = dateStrA.includes(".")
      ? new Date(dateStrA.split(".").reverse().join("-"))
      : new Date(dateStrA);

    const dateB = dateStrB.includes(".")
      ? new Date(dateStrB.split(".").reverse().join("-"))
      : new Date(dateStrB);

    return dateB - dateA;
  });

  gameKeys.forEach((gameID) => {
    const game = games[gameID];
    const info = game.gameInfo || {};

    const teamA = info.teamA;
    const teamB = info.teamB;

    if (teamA !== teamID && teamB !== teamID) return;

    const logoA = info.teamA_logo;
    const logoB = info.teamB_logo;

    const scoreA = info.scoreA ?? "-";
    const scoreB = info.scoreB ?? "-";

    const date = info.date || gameID.split("_")[0];
    const time = info.startTime || "";
    const location = info.location || "";

    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => {
      window.location.href = `stats.html?id=${gameID}`;
    };

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
          
          <div>
              <div>📅 ${date} • 🕒 ${time}</div>
              <div>📍 ${location}</div>
          </div>

          <div style="display:flex; gap:20px; align-items:center;">
              
              <div style="text-align:center;">
                  <img src="team_logo/${logoA}" 
                       style="width:55px; height:55px; border-radius:50%; cursor:pointer;"
                       onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${teamA}'">
                  <div>${teamA}</div>
              </div>

              <div style="font-size:22px;">${scoreA} : ${scoreB}</div>

              <div style="text-align:center;">
                  <img src="team_logo/${logoB}" 
                       style="width:55px; height:55px; border-radius:50%; cursor:pointer;"
                       onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${teamB}'">
                  <div>${teamB}</div>
              </div>

          </div>

      </div>
    `;

    gamesList.appendChild(card);
  });
}

function calculatePlayersForTeam(games, teamID) {
  const players = {};

  Object.values(games).forEach((game) => {
    const team = game.teams?.[teamID];
    if (!team || !team.players) return;

    Object.entries(team.players).forEach(([playerID, p]) => {
      const s = p.stats || {
        points: 0,
        two_made: 0,
        three_made: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        rebounds_off: 0,
        rebounds_def: 0,
        fg_attempts: 0,
        fg_made: 0,
        ft_attempts: 0,
        ft_made: 0,
        turnovers: 0,
      };

      if (!players[playerID]) {
        players[playerID] = {
          name: p.name,
          photo: p.photo || "default_player.png",
          games: 0,
          pts: 0,
          tpm2: 0,
          tpm3: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          reb: 0,
          eff: 0,
        };
      }

      players[playerID].games++;

      players[playerID].pts += Number(s.points) || 0;
      players[playerID].tpm2 += Number(s.two_made) || 0;
      players[playerID].tpm3 += Number(s.three_made) || 0;
      players[playerID].ast += Number(s.assists) || 0;
      players[playerID].stl += Number(s.steals) || 0;
      players[playerID].blk += Number(s.blocks) || 0;
      players[playerID].reb +=
        (Number(s.rebounds_off) || 0) + (Number(s.rebounds_def) || 0);
      const eff =
        Number(s.points || 0) +
        (Number(s.rebounds_off || 0) + Number(s.rebounds_def || 0)) +
        Number(s.assists || 0) +
        Number(s.steals || 0) +
        Number(s.blocks || 0) -
        (Number(s.fg_attempts || 0) - Number(s.fg_made || 0)) -
        (Number(s.ft_attempts || 0) - Number(s.ft_made || 0)) -
        Number(s.turnovers || 0);
      players[playerID].eff += eff;
    });
  });

  return players;
}

function renderPlayers(playersArray) {
  const cardsBefore = new Map();

  document.querySelectorAll(".player-card").forEach((card) => {
    cardsBefore.set(card.dataset.id, card.getBoundingClientRect());
  });

  playersList.innerHTML = "";

  playersArray.forEach(([id, p]) => {
    const statKey = currentSort.key;

    const effAvg = (p.eff / p.games).toFixed(1);
    const ptsAvg = (p.pts / p.games).toFixed(1);
    const tpm2Avg = (p.tpm2 / p.games).toFixed(1);
    const tpm3Avg = (p.tpm3 / p.games).toFixed(1);
    const astAvg = (p.ast / p.games).toFixed(1);
    const stlAvg = (p.stl / p.games).toFixed(1);
    const rebAvg = (p.reb / p.games).toFixed(1);

    const card = document.createElement("div");
    card.className = "player-card";
    card.dataset.id = id;

    card.innerHTML = `
      <div class="player-header">
          <img src="team_logo/${p.photo}" class="player-photo">
          <div><div class="player-name">${p.name}</div></div>
          <div style="margin-left:auto; text-align:right;">
              <div class="ou-box ${statKey === "games" ? "active-ou" : ""}">
                    OU: ${p.games}
               </div>
          </div>
      </div>

      <div class="player-stats-row">
          <div class="stat-box ${statKey === "eff" ? "active-stat" : ""}">
              <div>EFF</div><div>${effAvg}</div>
          </div>

          <div class="stat-box ${statKey === "pts" ? "active-stat" : ""}">
              <div>PTS</div><div>${ptsAvg}</div>
          </div>

          <div class="stat-box ${statKey === "tpm2" ? "active-stat" : ""}">
              <div>2PM</div><div>${tpm2Avg}</div>
          </div>

          <div class="stat-box ${statKey === "tpm3" ? "active-stat" : ""}">
              <div>3PM</div><div>${tpm3Avg}</div>
          </div>

          <div class="stat-box ${statKey === "ast" ? "active-stat" : ""}">
              <div>AST</div><div>${astAvg}</div>
          </div>

          <div class="stat-box ${statKey === "stl" ? "active-stat" : ""}">
              <div>STL</div><div>${stlAvg}</div>
          </div>

          <div class="stat-box ${statKey === "reb" ? "active-stat" : ""}">
              <div>REB</div><div>${rebAvg}</div>
          </div>

          
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `playerProfile.html?id=${id}`;
    });

    playersList.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll(".player-card").forEach((card) => {
      const before = cardsBefore.get(card.dataset.id);
      if (!before) return;

      const after = card.getBoundingClientRect();

      const dx = before.left - after.left;
      const dy = before.top - after.top;

      card.style.transition = "none";
      card.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        card.style.transition = "transform 0.6s ease";
        card.style.transform = "translate(0,0)";
      });
    });
  });
}

let currentPlayers = {};
let currentPlayersArray = [];
let currentSort = { key: null, direction: "desc" };
const SORT_MAP = {
  PTS: "pts",
  "2PM": "tpm2",
  "3PM": "tpm3",
  AST: "ast",
  STL: "stl",
  REB: "reb",
  EFF: "eff",
  OU: "games",
};

function sortPlayersBy(statKey) {
  statKey = SORT_MAP[statKey] || statKey;

  if (currentSort.key === statKey) {
    currentSort.direction = currentSort.direction === "desc" ? "asc" : "desc";
  } else {
    currentSort.key = statKey;
    currentSort.direction = "desc";
  }

  currentPlayersArray.sort((a, b) => {
    const A = a[1];
    const B = b[1];

    if (statKey === "games") {
      return currentSort.direction === "desc"
        ? B.games - A.games
        : A.games - B.games;
    }

    const gamesA = A.games || 1;
    const gamesB = B.games || 1;

    const valA = Number(A[statKey] ?? 0) / gamesA;
    const valB = Number(B[statKey] ?? 0) / gamesB;

    return currentSort.direction === "desc" ? valB - valA : valA - valB;
  });

  renderPlayers(currentPlayersArray);
}

get(gamesRef).then((snapshot) => {
  const games = snapshot.val();

  const totals = calculateTeamStats(games, teamID);
  renderTeamStats(totals);

  currentPlayers = calculatePlayersForTeam(games, teamID);
  currentPlayersArray = Object.entries(currentPlayers);
  renderPlayers(currentPlayersArray);

  renderTeamGames(games, teamID);

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sort-btn")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      sortPlayersBy(btn.dataset.sort);
    });
  });
});
