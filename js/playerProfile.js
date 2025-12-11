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
const playerID = urlParams.get("id");
const playerContainer = document.getElementById("playerContainer");
const statsGrid = document.getElementById("statsGrid");

const sectionTotals = document.getElementById("playersTotals");
const sectionGames = document.getElementById("playersSection");

const btnTotals = document.getElementById("btnTotals");
const btnPlayers = document.getElementById("btnPlayers");

btnTotals.onclick = () => {
  btnTotals.classList.add("active");
  btnPlayers.classList.remove("active");

  document.getElementById("playersTotals").style.display = "block";
  document.getElementById("playersSection").style.display = "none";
};

btnPlayers.onclick = () => {
  btnPlayers.classList.add("active");
  btnTotals.classList.remove("active");

  document.getElementById("playersTotals").style.display = "none";
  document.getElementById("playersSection").style.display = "block";
};

const gamesRef = ref(db, "games");

get(gamesRef).then((snapshot) => {
  if (!snapshot.exists()) {
    playerContainer.innerHTML = "<p>No games found.</p>";
    return;
  }

  const games = snapshot.val();

  let teamInfo = null;
  let playerData = null;

  Object.values(games).some((game) => {
    const info = game.gameInfo || {};
    const teams = game.teams || {};

    for (const teamID in teams) {
      const players = teams[teamID].players || {};

      if (players[playerID]) {
        playerData = players[playerID];
        teamInfo = {
          logo: teamID === info.teamA ? info.teamA_logo : info.teamB_logo,
          name: teamID === info.teamA ? info.teamA : info.teamB,
        };
        return true;
      }
    }
    return false;
  });

  if (!playerData || !teamInfo) {
    playerContainer.innerHTML = "<p>Player not found.</p>";
    return;
  }

  const playerPhoto =
    playerData.photo && playerData.photo !== ""
      ? `team_logo/${playerData.photo}`
      : "team_logo/default_player.png";
  const playerName = playerData.name || "Unknown Player";

  const logoPath = teamInfo.logo
    ? `team_logo/${teamInfo.logo}`
    : "team_logo/default.png";

  const mvpHtml =
    playerData.mvp_count > 0
      ? `<div class="mvp-badge">⭐ ${playerData.mvp_count}X MVP Utakmice ⭐</div>`
      : "";

  playerContainer.innerHTML = `
   <div class="player-card">
    <img class="player-photo" src="${playerPhoto}">

  <div class="player-info-block">
    <div class="player-name">${playerName}</div>

    <div class="team-info">
        <img 
            class="team-logo" 
            src="${logoPath}" 
            onclick="window.location.href = 'teamProfile.html?id=${encodeURIComponent(
              teamInfo.name
            )}'"
            style="cursor:pointer;"
          >
        <span class="team-name">${teamInfo.name}</span>
        </div>
         ${mvpHtml}
        </div>
    </div>
  `;
});

function calculatePlayerTotals(games, playerID) {
  const totals = {
    gamesPlayed: 0,
    points: 0,
    two_made: 0,
    two_attempts: 0,
    three_made: 0,
    three_attempts: 0,
    ft_made: 0,
    ft_attempts: 0,
    rebounds_off: 0,
    rebounds_def: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    eff: 0,
  };

  Object.values(games).forEach((game) => {
    const teams = game.teams || {};

    for (const teamID in teams) {
      const players = teams[teamID].players || {};

      if (players[playerID]) {
        const p = players[playerID].stats || {};

        totals.gamesPlayed++;

        totals.points += p.points || 0;

        totals.two_made += p.two_made || 0;
        totals.two_attempts += p.two_attempts || 0;

        totals.three_made += p.three_made || 0;
        totals.three_attempts += p.three_attempts || 0;

        totals.ft_made += p.ft_made || 0;
        totals.ft_attempts += p.ft_attempts || 0;

        totals.rebounds_off += p.rebounds_off || 0;
        totals.rebounds_def += p.rebounds_def || 0;

        totals.assists += p.assists || 0;
        totals.steals += p.steals || 0;
        totals.blocks += p.blocks || 0;

        totals.turnovers += p.turnovers || 0;

        const eff =
          (p.points || 0) +
          (p.rebounds_off || 0) +
          (p.rebounds_def || 0) +
          (p.assists || 0) +
          (p.steals || 0) +
          (p.blocks || 0) -
          ((p.two_attempts || 0) +
            (p.three_attempts || 0) -
            ((p.two_made || 0) + (p.three_made || 0))) -
          ((p.ft_attempts || 0) - (p.ft_made || 0)) -
          (p.turnovers || 0);

        totals.eff += eff;
      }
    }
  });

  return totals;
}

function renderPlayerStats(totals) {
  const gp = totals.gamesPlayed || 1;

  const stats = [
    {
      title: "FG",
      labels: ["FGA", "FGM"],
      avgVals: [
        ((totals.two_attempts + totals.three_attempts) / gp).toFixed(1),
        ((totals.two_made + totals.three_made) / gp).toFixed(1),
      ],
      totalVals: [
        totals.two_attempts + totals.three_attempts,
        totals.two_made + totals.three_made,
      ],
      percent:
        totals.two_attempts + totals.three_attempts
          ? (
              ((totals.two_made + totals.three_made) /
                (totals.two_attempts + totals.three_attempts)) *
              100
            ).toFixed(2)
          : "0",
    },

    {
      title: "2P",
      labels: ["2PTA", "2PTM"],
      avgVals: [
        (totals.two_attempts / gp).toFixed(1),
        (totals.two_made / gp).toFixed(1),
      ],
      totalVals: [totals.two_attempts, totals.two_made],
      percent: totals.two_attempts
        ? ((totals.two_made / totals.two_attempts) * 100).toFixed(2)
        : "0",
    },

    {
      title: "3P",
      labels: ["3PTA", "3PTM"],
      avgVals: [
        (totals.three_attempts / gp).toFixed(1),
        (totals.three_made / gp).toFixed(1),
      ],
      totalVals: [totals.three_attempts, totals.three_made],
      percent: totals.three_attempts
        ? ((totals.three_made / totals.three_attempts) * 100).toFixed(2)
        : "0",
    },

    /*{
          title: "FT",
          labels: ["FTA", "FTM"],
          avgVals: [
            (totals.ft_attempts / gp).toFixed(1),
            (totals.ft_made / gp).toFixed(1),
          ],
          totalVals: [totals.ft_attempts, totals.ft_made],
          percent: totals.ft_attempts
            ? ((totals.ft_made / totals.ft_attempts) * 100).toFixed(2)
            : "0",
        },*/

    {
      title: "REB O/D",
      labels: ["ORB", "DRB"],
      avgVals: [
        (totals.rebounds_off / gp).toFixed(1),
        (totals.rebounds_def / gp).toFixed(1),
      ],
      totalVals: [totals.rebounds_off, totals.rebounds_def],
    },

    {
      title: "EFF",
      labels: [""],
      avgVals: [(totals.eff / gp).toFixed(1)],
      totalVals: [totals.eff],
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
          labels: [""],
          avgVals: [(totals.blocks / gp).toFixed(1)],
          totalVals: [totals.blocks],
        },*/
  ];

  statsGrid.innerHTML = "";

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

                ${
                  s.percent
                    ? `<div class="stat-percent">${s.percent}%</div>`
                    : ""
                }
            </div>
        `;
  });
}

function renderPlayerGames(games, playerID) {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "",
    "VS",
    "EFF",
    "FG",
    "2P",
    "3P",
    "REB O/D",
    "AST",
    "TO",
    "STL",
    "BLK",
    "PTS",
  ];

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const gamesArray = Object.entries(games);

  gamesArray.sort((a, b) => {
    const dA = a[1].gameInfo?.date;
    const dB = b[1].gameInfo?.date;

    const dateA = dA?.includes(".")
      ? new Date(dA.split(".").reverse().join("-"))
      : new Date(dA);

    const dateB = dB?.includes(".")
      ? new Date(dB.split(".").reverse().join("-"))
      : new Date(dB);

    return dateB - dateA;
  });

  const tbody = document.createElement("tbody");

  gamesArray.forEach(([gameID, game]) => {
    const info = game.gameInfo || {};
    const teams = game.teams || {};

    for (const teamID in teams) {
      const players = teams[teamID].players || {};
      if (!players[playerID]) continue;

      const p = players[playerID].stats || {};

      const points = p.points ?? 0;

      const reboundsOff = p.rebounds_off ?? 0;
      const reboundsDef = p.rebounds_def ?? 0;
      const reboundsTotal = reboundsOff + reboundsDef;

      const fgMade = (p.two_made ?? 0) + (p.three_made ?? 0);
      const fgAtt = (p.two_attempts ?? 0) + (p.three_attempts ?? 0);

      const fgMiss = fgAtt - fgMade;
      const ftMiss = (p.ft_attempts ?? 0) - (p.ft_made ?? 0);

      const eff =
        points +
        reboundsTotal +
        (p.assists ?? 0) +
        (p.steals ?? 0) +
        (p.blocks ?? 0) -
        fgMiss -
        ftMiss -
        (p.turnovers ?? 0);

      const fgPct = fgAtt ? Math.round((fgMade / fgAtt) * 100) + "%" : "0%";
      const twoPct = p.two_attempts
        ? Math.round((p.two_made / p.two_attempts) * 100) + "%"
        : "0%";
      const threePct = p.three_attempts
        ? Math.round((p.three_made / p.three_attempts) * 100) + "%"
        : "0%";
      const ftPct = p.ft_attempts
        ? Math.round((p.ft_made / p.ft_attempts) * 100) + "%"
        : "0%";

      const opponentID = teamID === info.teamA ? info.teamB : info.teamA;
      const opponentLogo =
        teamID === info.teamA ? info.teamB_logo : info.teamA_logo;

      const row = document.createElement("tr");

      const tdBtn = document.createElement("td");
      const isMvp = info.mvpPlayerId === playerID;
      const mvpBadge = isMvp ? `<span class="mvp-badge-td">MVP</span>` : "";

      tdBtn.innerHTML = `
              <div style="display:flex; align-items:center; gap:6px;">
                    ${mvpBadge}
                    <span class="game-btn" style="cursor:pointer;">➜</span>
              </div>
            `;
      tdBtn.style.cursor = "pointer";
      tdBtn.onclick = () => (window.location.href = `stats.html?id=${gameID}`);
      row.appendChild(tdBtn);

      const scoreA = info.scoreA ?? 0;
      const scoreB = info.scoreB ?? 0;

      let isWin = false;
      if (teamID === info.teamA) {
        isWin = scoreA > scoreB;
      } else if (teamID === info.teamB) {
        isWin = scoreB > scoreA;
      }

      const tdOpp = document.createElement("td");
      tdOpp.innerHTML = `
        <div class="opp-wrapper" style="display: flex; align-items: center;">
          <div class="win-loss-indicator ${isWin ? "win" : "loss"}">
            ${isWin ? "W" : "L"}
          </div>
          <img src="team_logo/${opponentLogo}" style="width: 40px; height: 40px; border-radius: 50%;">
          <span style="margin-left: 8px;">${opponentID}</span>
        </div>
      `;
      row.appendChild(tdOpp);

      row.appendChild(createTD(eff));

      row.appendChild(createTD(`${fgMade}/${fgAtt} ${fgPct}`));

      row.appendChild(
        createTD(`${p.two_made ?? 0}/${p.two_attempts ?? 0} ${twoPct}`)
      );

      row.appendChild(
        createTD(`${p.three_made ?? 0}/${p.three_attempts ?? 0} ${threePct}`)
      );

      row.appendChild(
        createTD(`${reboundsTotal}  ${reboundsOff}/${reboundsDef}`)
      );

      ["assists", "turnovers", "steals", "blocks", "points"].forEach((stat) => {
        row.appendChild(createTD(p[stat] ?? 0));
      });

      tbody.appendChild(row);
    }
  });

  table.appendChild(tbody);
  list.appendChild(table);

  function createTD(value) {
    const td = document.createElement("td");
    td.textContent = value;
    return td;
  }
}

get(gamesRef).then((snapshot) => {
  if (!snapshot.exists()) {
    console.log("No games found.");
    return;
  }

  const games = snapshot.val();

  const totals = calculatePlayerTotals(games, playerID);
  renderPlayerStats(totals);
  renderPlayerGames(games, playerID);
});
