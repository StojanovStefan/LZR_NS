import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
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

let orderedTeams = [];
let globalTeams = {};
let gameInfo = null;

// ==============================
// GAME CHARTS
// ==============================

let scoreChart = null;
let leadChart = null;
let latestEvents = {};

// KOPIRANJE BROADCAST LINKA
window.copyBroadcastLink = async function () {
  if (!gameId) {
    console.error("gameId nije definisan!");
    showTemporaryNotification("ID utakmice nije dostupan!");
    return;
  }

  const url = new URL("/LZR_NS/broadcast.html", window.location.origin);

  url.searchParams.set("id", gameId);

  const link = url.toString();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
    } else {
      // Rezervna metoda za kopiranje
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand("copy");
      textarea.remove();

      if (!success) throw new Error("Kopiranje nije uspelo");
    }

    showTemporaryNotification("Broadcast link je kopiran!");
    console.log("Kopiran link:", link);
  } catch (err) {
    console.error("Greška pri kopiranju:", err);
    showTemporaryNotification("Greška pri kopiranju linka!");
  }
};

// OTVARANJE YOUTUBE LINKA
window.openYoutubeLink = function () {
  const youtubeUrl = gameInfo?.ytLink;

  if (!youtubeUrl) {
    showTemporaryNotification("YouTube link nije dostupan!");
    return;
  }

  try {
    const url = new URL(youtubeUrl);

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Neispravan YouTube link");
    }

    // Otvaranje mora biti direktno u okviru korisničkog klika
    const newTab = window.open(url.href, "_blank");

    if (!newTab) {
      showTemporaryNotification("Pregledač je blokirao otvaranje linka!");
    }
  } catch (err) {
    console.error("Greška YouTube linka:", err);
    showTemporaryNotification("YouTube link nije ispravan!");
  }
};

function showTemporaryNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.background = "#fbbf24";
  notification.style.color = "#000";
  notification.style.padding = "10px 15px";
  notification.style.borderRadius = "8px";
  notification.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  notification.style.zIndex = 9999;
  notification.style.opacity = "0";
  notification.style.transition = "opacity 0.3s ease";

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
  });
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.addEventListener("transitionend", () => {
      notification.remove();
    });
  }, 2000);
}

onValue(ref(db, `games/${gameId}/teams`), (snap) => {
  globalTeams = snap.val() || {};
  renderStats(globalTeams);
  renderTotals(globalTeams);
  if (gameInfo) renderGameHeader(gameInfo);
});

onValue(ref(db, `games/${gameId}/gameInfo`), (snap) => {
  const info = snap.val() || {};
  orderedTeams = [info.teamA, info.teamB];
  gameInfo = info;
  renderGameHeader(info);
});

function findBestPlayers(team) {
  if (!team) return [];

  const players = team.players || {};

  let bestPlayers = [];
  let maxEff = -Infinity;

  for (const number in players) {
    const p = players[number];
    const s = p.stats || {};

    const eff =
      Number(s.points || 0) +
      Number(s.rebounds_off || 0) +
      Number(s.rebounds_def || 0) +
      Number(s.assists || 0) +
      Number(s.steals || 0) +
      Number(s.blocks || 0) -
      Number(s.turnovers || 0) -
      (Number(s.fg_attempts || 0) -
        Number(s.fg_made || 0) +
        Number(s.ft_attempts || 0) -
        Number(s.ft_made || 0));

    const player = {
      playerId: p.playerId,
      name: p.name || "",
      number: p.number || number,
      photo: p.photo || "default_player.png",
      points: Number(s.points || 0),
      rebounds: Number(s.rebounds_off || 0) + Number(s.rebounds_def || 0),
      assists: Number(s.assists || 0),
      steals: Number(s.steals || 0),
      blocks: Number(s.blocks || 0),
    };

    if (eff > maxEff) {
      maxEff = eff;
      bestPlayers = [player];
    } else if (eff === maxEff) {
      bestPlayers.push(player);
    }
  }

  return bestPlayers;
}

function createPlayerCard(player, team, title, type, teamName, teamid) {
  if (!player) return "";

  teamName = teamName || "Nepoznata ekipa";

  return `
    <div class="mvp-block ${type}">

      <div class="mvp-player"
        onclick="window.location.href='playerProfile.html?id=${player.playerId}'">

        <div class="mvp-player-info">

          <img
            class="mvp-player-photo"
            src="team_logo/${player.photo}"
            onerror="this.onerror=null;this.src='team_logo/default_player.png';"
            alt="${player.name}"
          >

          <div class="mvp-player-details">

            <div class="mvp-player-name">
              <span class="mvp-number">#${player.number}</span>
              ${player.name}
            </div>

            <div class="mvp-player-label">
              ${title}
            </div>

          </div>
        </div>

        <div class="mvp-stats">

          <div class="mvp-stat">
            <strong>${player.points}</strong>
            <span>PTS</span>
          </div>

          <div class="mvp-stat">
            <strong>${player.rebounds}</strong>
            <span>REB</span>
          </div>

          <div class="mvp-stat">
            <strong>${player.assists}</strong>
            <span>AST</span>
          </div>

          <div class="mvp-stat">
            <strong>${player.steals}</strong>
            <span>STL</span>
          </div>

          <div class="mvp-stat">
            <strong>${player.blocks}</strong>
            <span>BLK</span>
          </div>

        </div>

       <div class="mvp-team-logo"
        onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${teamid}'"
        style="cursor: pointer;"
       >

          <img
            src="team_logo/${team.logo || "default_team.png"}"
            onerror="this.onerror=null;this.src='team_logo/default_team.png';"
            alt="Logo ekipe"
          >

          <span class="mvp-team-name">
            ${teamName}
          </span>

        </div>

      </div>
    </div>
  `;
}

function renderGameHeader(info) {
  // Zaustavi prethodno smenjivanje
  if (window.mvpRotationInterval) {
    clearInterval(window.mvpRotationInterval);
    window.mvpRotationInterval = null;
  }

  if (!info || !info.teamA || !info.teamB) {
    document.getElementById("gameHeader").innerHTML =
      "<p>Podaci o utakmici nisu dostupni.</p>";
    return;
  }

  const container = document.getElementById("gameHeader");

  const date = info.date || "";
  const startTime = info.startTime || "";

  let mvpHtml = "";

  let winnerPlayers = [];
  let loserPlayers = [];

  let winningTeam = null;
  let losingTeam = null;

  let winnerTeam = "";
  let loserTeam = "";

  let winnerName = "";
  let loserName = "";

  // MVP kartice prikazujemo samo kada je utakmica završena
  if (
    info.status === "finished" &&
    globalTeams[info.teamA] &&
    globalTeams[info.teamB]
  ) {
    const scoreA = Number(info.scoreA ?? 0);
    const scoreB = Number(info.scoreB ?? 0);

    winnerTeam = scoreA >= scoreB ? info.teamA : info.teamB;
    loserTeam = winnerTeam === info.teamA ? info.teamB : info.teamA;

    winningTeam = globalTeams[winnerTeam];
    losingTeam = globalTeams[loserTeam];

    // Svi igrači sa najboljim indeksom
    winnerPlayers = findBestPlayers(winningTeam);
    loserPlayers = findBestPlayers(losingTeam);

    winnerName =
      winnerTeam === "black_lions"
        ? "Lions"
        : winnerTeam === "white_dragons"
          ? "Dragons"
          : winnerTeam;

    loserName =
      loserTeam === "black_lions"
        ? "Lions"
        : loserTeam === "white_dragons"
          ? "Dragons"
          : loserTeam;

    // Početni prikaz - prvi igrač izjednačenih
    mvpHtml = `
      <div id="mvpWinnerSlot">
        ${createPlayerCard(
          winnerPlayers[0],
          winningTeam,
          "IGRAČ UTAKMICE",
          "mvp-winner",
          winnerName,
          winnerTeam,
        )}
      </div>

      <div id="mvpLoserSlot">
        ${createPlayerCard(
          loserPlayers[0],
          losingTeam,
          "ISTAKNUTI IGRAČ",
          "mvp-loser",
          loserName,
          loserTeam,
        )}
      </div>
    `;
  }

  // GLAVNI HEADER

  container.innerHTML = `
    <div class="game-header">

      <div class="game-info">
        📍 ${info.location || "Nepoznato"} •
        📅 ${date} •
        🕒 ${startTime} •

        <span
          class="live-broadcast"
          onclick="event.stopPropagation(); window.copyBroadcastLink()"
          title="Kopiraj broadcast link"
          style="cursor:pointer;"
        >🎦</span>

        •

        ${
          info.ytLink
            ? `
              <span
                class="yt-broadcast"
                onclick="event.stopPropagation(); window.openYoutubeLink()"
                title="Otvori YouTube prenos"
                style="cursor:pointer;"
              >📺</span>
            `
            : ""
        }

      </div>

      <div class="teams">

        <div class="team-block">
          <img
            src="team_logo/${info.teamA_logo || "default.png"}"
            class="big-logo"
            onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${info.teamA}'"
          >

          <div class="team-name-large">
            ${info.teamA}
          </div>
        </div>

        <div class="score-big-container">

          ${
            info.status === "finished"
              ? '<div class="final-result-text">Konačni rezultat</div>'
              : ""
          }

          <div class="score-big">
            ${info.scoreA ?? "-"} : ${info.scoreB ?? "-"}
          </div>

        </div>

        <div class="team-block">
          <img
            src="team_logo/${info.teamB_logo || "default.png"}"
            class="big-logo"
            onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${info.teamB}'"
          >

          <div class="team-name-large">
            ${info.teamB}
          </div>
        </div>

      </div>

      ${mvpHtml}

    </div>
  `;

  // SMENJIVANJE IZJEDNAČENIH IGRAČA NA SVAKIH 3 SEKUNDE

  if (
    info.status === "finished" &&
    (winnerPlayers.length > 1 || loserPlayers.length > 1)
  ) {
    let winnerIndex = 0;
    let loserIndex = 0;

    window.mvpRotationInterval = setInterval(() => {
      // MVP pobedničke ekipe
      if (winnerPlayers.length > 1) {
        winnerIndex = (winnerIndex + 1) % winnerPlayers.length;

        const winnerSlot = document.getElementById("mvpWinnerSlot");

        if (winnerSlot) {
          winnerSlot.innerHTML = createPlayerCard(
            winnerPlayers[winnerIndex],
            winningTeam,
            "IGRAČ UTAKMICE",
            "mvp-winner",
            winnerName,
            winnerTeam,
          );
        }
      }

      // Istaknuti igrač poražene ekipe
      if (loserPlayers.length > 1) {
        loserIndex = (loserIndex + 1) % loserPlayers.length;

        const loserSlot = document.getElementById("mvpLoserSlot");

        if (loserSlot) {
          loserSlot.innerHTML = createPlayerCard(
            loserPlayers[loserIndex],
            losingTeam,
            "ISTAKNUTI IGRAČ",
            "mvp-loser",
            loserName,
            loserTeam,
          );
        }
      }
    }, 3000);
  }
}

function tryRenderAll() {
  if (gameInfo && Object.keys(globalTeams).length) {
    renderStats(globalTeams);
    renderTotals(globalTeams);
    renderGameHeader(gameInfo);

    // VAŽNO: napravi grafikone tek kada imamo ekipe i podatke
    renderCharts(latestEvents);
  }
}

onValue(ref(db, `games/${gameId}/teams`), (snap) => {
  globalTeams = snap.val() || {};
  tryRenderAll();
});

onValue(ref(db, `games/${gameId}/gameInfo`), (snap) => {
  const info = snap.val() || {};
  orderedTeams = [info.teamA, info.teamB];
  gameInfo = info;
  tryRenderAll();
});

function renderStats(teams) {
  const container = document.getElementById("statsContainer");
  container.innerHTML = "";

  const sortedTeamNames = orderedTeams.filter((t) => teams[t]);

  for (const teamName of sortedTeamNames) {
    const team = teams[teamName];
    const players = team.players || {};

    const playersArray = Object.values(players).sort(
      (a, b) => (a.number || 0) - (b.number || 0),
    );

    const div = document.createElement("div");
    div.className = "teamStats";

    // =====================================
    // TABELA
    // =====================================

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = [
      "#",
      "Igrač",
      "EFF",
      "FG",
      "2P",
      "3P",
      "FT",
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

    const tbody = document.createElement("tbody");

    // =====================================
    // UKUPNA STATISTIKA EKIPE
    // =====================================

    const teamTotal = playersArray.reduce(
      (total, player) => {
        const s = player.stats || {};

        const fields = [
          "fg_made",
          "fg_attempts",
          "two_made",
          "two_attempts",
          "three_made",
          "three_attempts",
          "ft_made",
          "ft_attempts",
          "rebounds_off",
          "rebounds_def",
          "assists",
          "turnovers",
          "steals",
          "blocks",
          "points",
        ];

        fields.forEach((field) => {
          total[field] += Number(s[field] || 0);
        });

        return total;
      },
      {
        fg_made: 0,
        fg_attempts: 0,
        two_made: 0,
        two_attempts: 0,
        three_made: 0,
        three_attempts: 0,
        ft_made: 0,
        ft_attempts: 0,
        rebounds_off: 0,
        rebounds_def: 0,
        assists: 0,
        turnovers: 0,
        steals: 0,
        blocks: 0,
        points: 0,
      },
    );

    // PROCENTI ŠUTA
    function teamPercentage(made, attempts) {
      if (!attempts) return "0%";

      return ((made / attempts) * 100).toFixed(1) + "%";
    }

    // =====================================
    // PRVI RED - TIMSKA STATISTIKA
    // =====================================

    const teamRow = document.createElement("tr");
    teamRow.className = "team-total-row";

    // LOGO I NAZIV EKIPE
    const teamCell = document.createElement("td");
    teamCell.colSpan = 2;
    teamCell.className = "team-total-name";

    const teamWrapper = document.createElement("div");
    teamWrapper.className = "team-total-wrapper";

    const teamLogo = document.createElement("img");
    teamLogo.src = "team_logo/" + (team.logo || "default.png");
    teamLogo.className = "team-total-logo";

    teamLogo.onerror = function () {
      this.src = "team_logo/default.png";
    };

    teamLogo.style.cursor = "pointer";
    teamLogo.onclick = () => {
      window.location.href = `teamProfile.html?id=${teamName}`;
    };

    const teamNameSpan = document.createElement("span");
    teamNameSpan.textContent = teamName;

    teamWrapper.appendChild(teamLogo);
    teamWrapper.appendChild(teamNameSpan);

    teamCell.appendChild(teamWrapper);
    teamRow.appendChild(teamCell);

    // POMOĆNA FUNKCIJA ZA ĆELIJE
    function addTeamCell(value) {
      const td = document.createElement("td");
      td.textContent = value;
      teamRow.appendChild(td);
    }

    // EFF
    addTeamCell("-");

    // FG
    addTeamCell(
      `${teamTotal.fg_made}/${teamTotal.fg_attempts}\n${teamPercentage(
        teamTotal.fg_made,
        teamTotal.fg_attempts,
      )}`,
    );

    // 2P
    addTeamCell(
      `${teamTotal.two_made}/${teamTotal.two_attempts}\n${teamPercentage(
        teamTotal.two_made,
        teamTotal.two_attempts,
      )}`,
    );

    // 3P
    addTeamCell(
      `${teamTotal.three_made}/${teamTotal.three_attempts}\n${teamPercentage(
        teamTotal.three_made,
        teamTotal.three_attempts,
      )}`,
    );

    // FT
    addTeamCell(
      `${teamTotal.ft_made}/${teamTotal.ft_attempts}\n${teamPercentage(
        teamTotal.ft_made,
        teamTotal.ft_attempts,
      )}`,
    );

    // REB O/D
    const totalRebounds = teamTotal.rebounds_off + teamTotal.rebounds_def;

    addTeamCell(
      `${totalRebounds}\n${teamTotal.rebounds_off} / ${teamTotal.rebounds_def}`,
    );

    // AST
    addTeamCell(teamTotal.assists);

    // TO
    addTeamCell(teamTotal.turnovers);

    // STL
    addTeamCell(teamTotal.steals);

    // BLK
    addTeamCell(teamTotal.blocks);

    // PTS
    addTeamCell(teamTotal.points);

    // UBACUJEMO TIMSKU STATISTIKU PRE IGRAČA
    tbody.appendChild(teamRow);

    // =====================================
    // POSTOJEĆI PRIKAZ IGRAČA
    // =====================================

    for (const p of playersArray) {
      const s = p.stats || {};

      const row = document.createElement("tr");

      const tdNumber = document.createElement("td");
      tdNumber.textContent = p.number ?? "-";
      row.appendChild(tdNumber);

      const tdName = document.createElement("td");
      tdName.className = "player-cell";

      const playerWrapper = document.createElement("div");
      playerWrapper.className = "player-wrapper";
      playerWrapper.style.cursor = "pointer";

      playerWrapper.onclick = () => {
        window.location.href = `playerProfile.html?id=${p.playerId}`;
      };

      const playerImg = document.createElement("img");
      playerImg.src = `team_logo/${p.photo || "default_player.png"}`;
      playerImg.alt = p.name;
      playerImg.className = "player-img";
      playerImg.onerror = function () {
        this.src = "team_logo/default_player.png";
      };

      const nameSpan = document.createElement("span");
      nameSpan.className = "player-name";
      nameSpan.textContent = p.name;

      playerWrapper.appendChild(playerImg);
      playerWrapper.appendChild(nameSpan);
      tdName.appendChild(playerWrapper);
      row.appendChild(tdName);

      const eff =
        (s.points || 0) +
        (s.rebounds_off || 0) +
        (s.rebounds_def || 0) +
        (s.assists || 0) +
        (s.steals || 0) +
        (s.blocks || 0) -
        (s.turnovers || 0) -
        ((s.fg_attempts || 0) -
          (s.fg_made || 0) +
          (s.ft_attempts || 0) -
          (s.ft_made || 0));

      const fgPct = s.fg_attempts
        ? Math.round((s.fg_made / s.fg_attempts) * 100) + "%"
        : "0%";

      const twoPct = s.two_attempts
        ? Math.round((s.two_made / s.two_attempts) * 100) + "%"
        : "0%";

      const threePct = s.three_attempts
        ? Math.round((s.three_made / s.three_attempts) * 100) + "%"
        : "0%";

      const ftPct = s.ft_attempts
        ? Math.round((s.ft_made / s.ft_attempts) * 100) + "%"
        : "0%";

      const tdEff = document.createElement("td");
      tdEff.textContent = eff;
      row.appendChild(tdEff);

      const tdFG = document.createElement("td");
      tdFG.textContent = `${s.fg_made || 0}/${s.fg_attempts || 0} ${fgPct}`;
      row.appendChild(tdFG);

      const tdTwo = document.createElement("td");
      tdTwo.textContent = `${s.two_made || 0}/${s.two_attempts || 0} ${twoPct}`;
      row.appendChild(tdTwo);

      const tdThree = document.createElement("td");
      tdThree.textContent = `${s.three_made || 0}/${s.three_attempts || 0} ${threePct}`;
      row.appendChild(tdThree);

      const tdFT = document.createElement("td");
      tdFT.textContent = `${s.ft_made || 0}/${s.ft_attempts || 0} ${ftPct}`;
      row.appendChild(tdFT);

      const tdReb = document.createElement("td");
      tdReb.textContent = `${(s.rebounds_off || 0) + (s.rebounds_def || 0)}\n${
        s.rebounds_off || 0
      } / ${s.rebounds_def || 0}`;
      row.appendChild(tdReb);

      const tdAST = document.createElement("td");
      tdAST.textContent = s.assists || 0;
      row.appendChild(tdAST);

      const tdTO = document.createElement("td");
      tdTO.textContent = s.turnovers || 0;
      row.appendChild(tdTO);

      const tdSTL = document.createElement("td");
      tdSTL.textContent = s.steals || 0;
      row.appendChild(tdSTL);

      const tdBLK = document.createElement("td");
      tdBLK.textContent = s.blocks || 0;
      row.appendChild(tdBLK);

      const tdPTS = document.createElement("td");
      tdPTS.textContent = s.points || 0;
      row.appendChild(tdPTS);

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    div.appendChild(table);
    container.appendChild(div);
  }
}

/* ------------------ Game TimeLine ------------------ */

onValue(ref(db, `games/${gameId}/events`), (snap) => {
  latestEvents = snap.val() || {};

  renderTimeline(latestEvents);

  renderCharts(latestEvents);
});

function renderTimeline(events) {
  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";

  const sortedEvents = Object.values(events).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  function getTeamByPlayer(playerName) {
    for (const teamName in globalTeams) {
      const players = globalTeams[teamName].players || {};
      for (const num in players) {
        if (players[num].name === playerName) {
          return teamName;
        }
      }
    }
    return null;
  }

  let scoreA = 0;
  let scoreB = 0;

  sortedEvents.forEach((ev) => {
    const date = new Date(ev.timestamp);
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const time = `${minutes}:${seconds}`;

    let text = "";
    let points = 0;

    switch (ev.type) {
      case "points_2":
        text = "pogađa šut za dva poena";
        points = 2;
        break;
      case "miss_2":
        text = "promašuje šut za dva poena";
        break;
      case "points_3":
        text = "pogađa šut za tri poena";
        points = 3;
        break;
      case "miss_3":
        text = "promašuje šut za tri poena";
        break;
      case "points_1":
        points = 1;
        text = "pogađa šut za jedan poen";
        break;
      case "miss_1":
        text = "promašuje šut za jedan poen";
        break;
      case "assists":
        text = "Asistira";
        break;
      case "rebounds_def":
        text = "Skok u odbrani";
        break;
      case "rebounds_off":
        text = "Skok u napadu";
        break;
      case "steals":
        text = "osvaja loptu";
        break;
      case "turnovers":
        text = "gubi loptu";
        break;
      case "blocks":
        text = "Blokada";
        break;
      default:
        text = ev.type;
    }
    const teamName = ev.team || getTeamByPlayer(ev.playerName);
    const alignmentClass =
      teamName === orderedTeams[1] ? "event-right" : "event-left";
    const logo = globalTeams[teamName]?.logo || "default.png";
    const players = globalTeams[teamName]?.players || {};
    const playerData = Object.values(players).find(
      (p) => p.name === ev.playerName,
    );
    const playerImage = playerData?.photo
      ? `team_logo/${playerData.photo}`
      : `team_logo/default-player.png`;

    let bubbleScore = null;

    if (points > 0) {
      if (teamName === orderedTeams[0]) scoreA += points;
      else scoreB += points;

      bubbleScore = `${scoreA} - ${scoreB}`;
    }

    if (bubbleScore) {
      const scoreBubble = document.createElement("div");
      scoreBubble.className = "timeline-score";
      scoreBubble.textContent = bubbleScore;
      container.appendChild(scoreBubble);
    }

    const div = document.createElement("div");
    div.className = `event-card ${alignmentClass}`;
    div.innerHTML = `
      <img src="team_logo/${logo}" class="event-logo">

      <img
        src="${playerImage}"
        class="event-player-image"
        onerror="this.onerror=null; this.src='team_logo/default_player.png'"
      >

      <div class="event-text">
        <div class="event-player">${ev.playerName}</div>
        <div class="event-type">${text}</div>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ==============================
   GAME CHARTS
============================== */

function renderCharts(events) {
  if (typeof Chart === "undefined") {
    console.error("Chart.js nije učitan!");
    return;
  }

  console.log("Grafikoni se kreiraju...");
  console.log("Ekipe:", orderedTeams);
  console.log("Događaji:", events);

  const teamA = orderedTeams[0];
  const teamB = orderedTeams[1];

  if (!teamA || !teamB) return;

  const sortedEvents = Object.values(events || {}).sort(
    (a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0),
  );

  let scoreA = 0;
  let scoreB = 0;

  const labels = ["Početak"];
  const scoresA = [0];
  const scoresB = [0];
  const leadData = [0];

  // ==============================
  // BOJE
  // ==============================

  const TEAM_A_COLOR = "#303030";
  const TEAM_B_COLOR = "#a8e52d";
  const TIE_COLOR = "#94A3B8";

  const isMobile = window.innerWidth <= 480;

  // ==============================
  // PRONALAZAK EKIPE PREKO IGRAČA
  // ==============================

  function getEventTeam(ev) {
    if (ev.team === teamA || ev.team === teamB) {
      return ev.team;
    }

    for (const teamName of orderedTeams) {
      const players = globalTeams[teamName]?.players || {};

      const found = Object.values(players).some(
        (p) => p.name === ev.playerName,
      );

      if (found) return teamName;
    }

    return null;
  }

  const pointsMap = {
    points_1: 1,
    points_2: 2,
    points_3: 3,
  };

  // ==============================
  // NAJDUŽI NIZ POENA
  // ==============================

  let currentRunTeam = null;
  let currentRunPoints = 0;
  let currentRunStart = 0;
  let currentRunEnd = 0;

  let currentRunStartScoreA = 0;
  let currentRunStartScoreB = 0;
  let currentRunEndScoreA = 0;
  let currentRunEndScoreB = 0;

  const longestRuns = {
    A: {
      points: 0,
      start: 0,
      end: 0,
      startScoreA: 0,
      startScoreB: 0,
      endScoreA: 0,
      endScoreB: 0,
    },
    B: {
      points: 0,
      start: 0,
      end: 0,
      startScoreA: 0,
      startScoreB: 0,
      endScoreA: 0,
      endScoreB: 0,
    },
  };

  function finishScoringRun() {
    if (!currentRunTeam || currentRunPoints === 0) return;

    const run = longestRuns[currentRunTeam];

    if (currentRunPoints > run.points) {
      run.points = currentRunPoints;
      run.start = currentRunStart;
      run.end = currentRunEnd;

      run.startScoreA = currentRunStartScoreA;
      run.startScoreB = currentRunStartScoreB;

      run.endScoreA = currentRunEndScoreA;
      run.endScoreB = currentRunEndScoreB;
    }
  }

  // ==============================
  // OBRADA DOGAĐAJA
  // ==============================

  sortedEvents.forEach((ev, index) => {
    const points = pointsMap[ev.type] || 0;

    if (points > 0) {
      const team = getEventTeam(ev);

      let scoringTeam = null;

      if (team === teamA) {
        scoringTeam = "A";
      } else if (team === teamB) {
        scoringTeam = "B";
      }

      if (scoringTeam) {
        if (currentRunTeam !== scoringTeam) {
          finishScoringRun();

          currentRunTeam = scoringTeam;
          currentRunPoints = 0;

          currentRunStart = index + 1;
          currentRunEnd = index + 1;

          currentRunStartScoreA = scoreA;
          currentRunStartScoreB = scoreB;
        }

        if (scoringTeam === "A") {
          scoreA += points;
        } else {
          scoreB += points;
        }

        currentRunPoints += points;
        currentRunEnd = index + 1;

        currentRunEndScoreA = scoreA;
        currentRunEndScoreB = scoreB;
      }
    }

    labels.push("");

    scoresA.push(scoreA);
    scoresB.push(scoreB);

    leadData.push(scoreA - scoreB);
  });

  finishScoringRun();

  // ==============================
  // NAJVEĆA PREDNOST
  // ==============================

  let maxLeadA = {
    value: 0,
    index: 0,
    scoreA: 0,
    scoreB: 0,
  };

  let maxLeadB = {
    value: 0,
    index: 0,
    scoreA: 0,
    scoreB: 0,
  };

  leadData.forEach((value, index) => {
    if (value > maxLeadA.value) {
      maxLeadA = {
        value,
        index,
        scoreA: scoresA[index],
        scoreB: scoresB[index],
      };
    }

    if (value < 0 && Math.abs(value) > maxLeadB.value) {
      maxLeadB = {
        value: Math.abs(value),
        index,
        scoreA: scoresA[index],
        scoreB: scoresB[index],
      };
    }
  });

  // ==============================
  // UNIŠTAVANJE STARIH GRAFIKONA
  // ==============================

  scoreChart?.destroy();
  leadChart?.destroy();

  // ==============================
  // 1. KRETANJE REZULTATA
  // ==============================

  const scoreCanvas = document.getElementById("scoreChart");

  if (!scoreCanvas) return;

  scoreChart = new Chart(scoreCanvas, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: teamA,
          data: scoresA,
          backgroundColor: TEAM_A_COLOR,
          borderColor: TEAM_A_COLOR,
          borderWidth: 2.5,
          stepped: "after",
          borderCapStyle: "round",
          borderJoinStyle: "round",
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 10,
          pointBorderWidth: 0,

          pointBackgroundColor: scoresA.map((value, index) =>
            scoresA[index] === scoresB[index] ? TIE_COLOR : TEAM_A_COLOR,
          ),

          pointBorderColor: scoresA.map((value, index) =>
            scoresA[index] === scoresB[index] ? TIE_COLOR : TEAM_A_COLOR,
          ),

          fill: false,
        },
        {
          label: teamB,
          data: scoresB,
          backgroundColor: TEAM_B_COLOR,
          borderColor: TEAM_B_COLOR,
          borderWidth: 2.5,
          stepped: "after",
          borderCapStyle: "round",
          borderJoinStyle: "round",
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 10,
          pointBorderWidth: 0,

          pointBackgroundColor: scoresB.map((value, index) =>
            scoresA[index] === scoresB[index] ? TIE_COLOR : TEAM_B_COLOR,
          ),

          pointBorderColor: scoresB.map((value, index) =>
            scoresA[index] === scoresB[index] ? TIE_COLOR : TEAM_B_COLOR,
          ),

          fill: false,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      animation: {
        duration: 500,
      },

      plugins: {
        legend: {
          display: true,
          position: isMobile ? "bottom" : "top",

          labels: {
            usePointStyle: true,
            pointStyle: "rect",
            boxWidth: 11,
            boxHeight: 11,
            padding: isMobile ? 12 : 20,

            font: {
              size: isMobile ? 11 : 13,
              weight: "bold",
            },

            generateLabels: () => [
              {
                text: teamA,
                fillStyle: TEAM_A_COLOR,
                strokeStyle: TEAM_A_COLOR,
                lineWidth: 0,
                pointStyle: "circle",
              },
              {
                text: teamB,
                fillStyle: TEAM_B_COLOR,
                strokeStyle: TEAM_B_COLOR,
                lineWidth: 0,
                pointStyle: "circle",
              },
              {
                text: "Nerešeno",
                fillStyle: TIE_COLOR,
                strokeStyle: TIE_COLOR,
                lineWidth: 0,
                pointStyle: "circle",
              },
            ],
          },
        },

        tooltip: {
          backgroundColor: "#172b43",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 12,
          displayColors: true,

          callbacks: {
            title: () => "Rezultat utakmice",

            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y} poena`,

            labelColor: (context) => {
              const teamColor =
                context.datasetIndex === 0 ? TEAM_A_COLOR : TEAM_B_COLOR;

              return {
                backgroundColor: teamColor,
                borderColor: teamColor,
                borderWidth: 0,
                borderRadius: 2,
              };
            },
          },
        },
      },

      scales: {
        x: {
          ticks: {
            display: false,
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,
          suggestedMax: 100,

          title: {
            display: true,
            text: "Poeni",
          },

          ticks: {
            stepSize: 10,
            precision: 0,
          },

          grid: {
            color: "#e5e7eb",
            lineWidth: 1,
            drawTicks: false,
          },

          border: {
            display: false,
          },
        },
      },
    },
  });

  // ==============================
  // 2. OZNAKE NA GRAFIKONU PREDNOSTI
  // ==============================

  const leadHighlightsPlugin = {
    id: "leadHighlights",

    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;

      if (!chartArea) return;

      const runs = [
        {
          run: longestRuns.A,
          background: "rgba(48, 48, 48, 0.09)",
        },
        {
          run: longestRuns.B,
          background: "rgba(168, 229, 45, 0.14)",
        },
      ];

      runs.forEach(({ run, background }) => {
        if (!run.points) return;

        const startX = scales.x.getPixelForValue(run.start);
        const endX = scales.x.getPixelForValue(run.end);

        const left = Math.max(chartArea.left, startX);
        const right = Math.min(chartArea.right, endX);

        ctx.save();
        ctx.fillStyle = background;

        ctx.fillRect(
          left,
          chartArea.top,
          Math.max(right - left, 5),
          chartArea.bottom - chartArea.top,
        );

        ctx.restore();
      });
    },

    // ==============================
    // KAPLJICE I BROJEVI NIZOVA
    // ==============================

    afterDatasetsDraw(chart) {
      const { ctx, scales, chartArea } = chart;

      if (!chartArea) return;

      function drawPin(index, value, color, text) {
        const x = scales.x.getPixelForValue(index);
        const pointY = scales.y.getPixelForValue(value);

        const radius = 14;
        const placeBelow = pointY < chartArea.top + 55;
        const centerY = placeBelow ? pointY + 29 : pointY - 29;

        ctx.save();
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.arc(x, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();

        if (placeBelow) {
          ctx.moveTo(x - 8, centerY - 9);
          ctx.lineTo(x, pointY);
          ctx.lineTo(x + 8, centerY - 9);
        } else {
          ctx.moveTo(x - 8, centerY + 9);
          ctx.lineTo(x, pointY);
          ctx.lineTo(x + 8, centerY + 9);
        }

        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, centerY);

        ctx.restore();
      }

      function drawRunNumber(run, color) {
        if (!run.points) return;

        const startX = scales.x.getPixelForValue(run.start);
        const endX = scales.x.getPixelForValue(run.end);

        const centerX = (startX + endX) / 2;

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillText(String(run.points), centerX, chartArea.top + 12);

        ctx.restore();
      }

      if (maxLeadA.value > 0) {
        drawPin(
          maxLeadA.index,
          leadData[maxLeadA.index],
          TEAM_A_COLOR,
          `+${maxLeadA.value}`,
        );
      }

      if (maxLeadB.value > 0) {
        drawPin(
          maxLeadB.index,
          leadData[maxLeadB.index],
          TEAM_B_COLOR,
          `+${maxLeadB.value}`,
        );
      }

      drawRunNumber(longestRuns.A, TEAM_A_COLOR);
      drawRunNumber(longestRuns.B, TEAM_B_COLOR);
    },

    // ==============================
    // STATISTIČKE LABELE
    // ==============================

    afterDraw(chart) {
      const { ctx, chartArea } = chart;

      if (!chartArea) return;

      const items = [
        {
          color: TEAM_A_COLOR,
          title: `Najveća prednost: +${maxLeadA.value}`,
          score: maxLeadA.value > 0 ? [maxLeadA.scoreA, maxLeadA.scoreB] : null,
          fallback: "Nije ostvarena prednost",
        },
        {
          color: TEAM_B_COLOR,
          title: `Najveća prednost: +${maxLeadB.value}`,
          score: maxLeadB.value > 0 ? [maxLeadB.scoreA, maxLeadB.scoreB] : null,
          fallback: "Nije ostvarena prednost",
        },
        {
          color: TEAM_A_COLOR,
          title: `Najduži niz poena: ${longestRuns.A.points}`,
          scoreStart:
            longestRuns.A.points > 0
              ? [longestRuns.A.startScoreA, longestRuns.A.startScoreB]
              : null,
          scoreEnd:
            longestRuns.A.points > 0
              ? [longestRuns.A.endScoreA, longestRuns.A.endScoreB]
              : null,
          fallback: "Nema niza",
        },
        {
          color: TEAM_B_COLOR,
          title: `Najduži niz poena: ${longestRuns.B.points}`,
          scoreStart:
            longestRuns.B.points > 0
              ? [longestRuns.B.startScoreA, longestRuns.B.startScoreB]
              : null,
          scoreEnd:
            longestRuns.B.points > 0
              ? [longestRuns.B.endScoreA, longestRuns.B.endScoreB]
              : null,
          fallback: "Nema niza",
        },
      ];

      ctx.save();

      const columns = isMobile ? 1 : 2;
      const columnWidth = chartArea.width / columns;
      const rowHeight = isMobile ? 39 : 43;
      const startY = chartArea.bottom + (isMobile ? 17 : 18);

      const dotRadius = 3.5;
      const textOffset = 17;

      // Crtanje rezultata sa obojenim tačkama
      function drawScore(scoreA, scoreB, x, y, maxWidth) {
        ctx.save();

        ctx.font = `${isMobile ? 10 : 11}px Arial`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        const scoreText = `${scoreA} - ${scoreB}`;
        const textWidth = ctx.measureText(scoreText).width;

        const dotGap = 6;
        const totalWidth =
          dotRadius * 2 + dotGap + textWidth + dotGap + dotRadius * 2;

        let startX = x;

        // Ako nema dovoljno mesta, smanjujemo razmak
        if (totalWidth > maxWidth) {
          startX = x;
        }

        // Prva tačka – prva ekipa
        ctx.beginPath();
        ctx.arc(startX + dotRadius, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = TEAM_A_COLOR;
        ctx.fill();

        // Rezultat
        const textX = startX + dotRadius * 2 + dotGap;

        ctx.fillStyle = "#65778b";
        ctx.fillText(scoreText, textX, y);

        // Druga tačka – druga ekipa
        const secondDotX = textX + textWidth + dotGap + dotRadius;

        ctx.beginPath();
        ctx.arc(secondDotX, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = TEAM_B_COLOR;
        ctx.fill();

        ctx.restore();

        return secondDotX + dotRadius - x;
      }

      items.forEach((item, index) => {
        const column = isMobile ? 0 : index % 2;
        const row = isMobile ? index : Math.floor(index / 2);

        const x = chartArea.left + column * columnWidth;
        const y = startY + row * rowHeight;

        // Obojena tačka statistike
        ctx.beginPath();
        ctx.arc(x + dotRadius, y + 7, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        // Naslov statistike
        ctx.fillStyle = "#243f5c";
        ctx.font = `600 ${isMobile ? 11 : 13}px Arial`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        ctx.fillText(
          item.title,
          x + textOffset,
          y,
          Math.max(columnWidth - textOffset - 8, 40),
        );

        const detailX = x + textOffset;
        const detailY = y + 25;
        const availableWidth = columnWidth - textOffset - 8;

        if (item.score) {
          drawScore(
            item.score[0],
            item.score[1],
            detailX,
            detailY,
            availableWidth,
          );
        } else if (item.scoreStart && item.scoreEnd) {
          const firstWidth = drawScore(
            item.scoreStart[0],
            item.scoreStart[1],
            detailX,
            detailY,
            availableWidth,
          );

          ctx.font = `${isMobile ? 10 : 11}px Arial`;
          ctx.fillStyle = "#65778b";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const arrowX = detailX + firstWidth + 5;

          ctx.fillText("→", arrowX, detailY);

          drawScore(
            item.scoreEnd[0],
            item.scoreEnd[1],
            arrowX + 15,
            detailY,
            availableWidth - firstWidth - 15,
          );
        } else {
          ctx.fillStyle = "#65778b";
          ctx.font = `${isMobile ? 10 : 11}px Arial`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(item.fallback, detailX, detailY);
        }
      });

      ctx.restore();
    },
  };

  // ==============================
  // 3. PRAĆENJE PREDNOSTI
  // ==============================

  const leadCanvas = document.getElementById("leadChart");

  if (!leadCanvas) return;

  leadChart = new Chart(leadCanvas, {
    type: "line",

    plugins: [leadHighlightsPlugin],

    data: {
      labels,

      datasets: [
        {
          label: "Prednost",
          data: leadData,

          borderWidth: 2.5,
          borderColor: TIE_COLOR,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBorderWidth: 0,

          pointBackgroundColor: leadData.map((value) => {
            if (value > 0) return TEAM_A_COLOR;
            if (value < 0) return TEAM_B_COLOR;
            return TIE_COLOR;
          }),

          pointBorderColor: leadData.map((value) => {
            if (value > 0) return TEAM_A_COLOR;
            if (value < 0) return TEAM_B_COLOR;
            return TIE_COLOR;
          }),

          tension: 0.2,
          fill: false,

          segment: {
            borderColor: (context) => {
              const start = context.p0.parsed.y;
              const end = context.p1.parsed.y;

              if ((start > 0 && end < 0) || (start < 0 && end > 0)) {
                return TIE_COLOR;
              }

              if (end > 0) return TEAM_A_COLOR;
              if (end < 0) return TEAM_B_COLOR;

              return TIE_COLOR;
            },
          },
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      layout: {
        padding: {
          top: 38,
          bottom: isMobile ? 185 : 105,
          left: 4,
          right: 4,
        },
      },

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: {
          display: true,
          position: "top",

          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: isMobile ? 10 : 18,

            font: {
              size: isMobile ? 10 : 13,
              weight: "bold",
            },

            generateLabels: () => [
              {
                text: teamA,
                fillStyle: TEAM_A_COLOR,
                strokeStyle: TEAM_A_COLOR,
                pointStyle: "circle",
              },
              {
                text: teamB,
                fillStyle: TEAM_B_COLOR,
                strokeStyle: TEAM_B_COLOR,
                pointStyle: "circle",
              },
              {
                text: "Nerešeno",
                fillStyle: TIE_COLOR,
                strokeStyle: TIE_COLOR,
                pointStyle: "circle",
              },
            ],
          },
        },

        tooltip: {
          backgroundColor: "#172b43",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 12,

          callbacks: {
            title: () => "Prednost u utakmici",

            label: (context) => {
              const value = context.parsed.y;

              if (value > 0) {
                return `${teamA} vodi sa ${value} poena`;
              }

              if (value < 0) {
                return `${teamB} vodi sa ${Math.abs(value)} poena`;
              }

              return "Rezultat je nerešen";
            },
          },
        },
      },

      scales: {
        x: {
          ticks: {
            display: false,
          },
          grid: {
            display: false,
          },
        },

        y: {
          title: {
            display: true,
            text: "Razlika u poenima",
          },

          ticks: {
            precision: 0,
          },

          grid: {
            color: (context) =>
              context.tick.value === 0 ? "#172b43" : "#e5eaf0",

            lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
          },
        },
      },
    },
  });
}

/* ------------------ FULL TEAMS TOTALS ------------------ */

function renderTotals(teams) {
  const container = document.getElementById("teamTotals");
  container.innerHTML = "";

  if (!orderedTeams.length) return;

  const [A, B] = orderedTeams;
  const tA = teams[A].team_stats || {};
  const tB = teams[B].team_stats || {};

  function pct(made, att) {
    if (!att || att === 0) return 0;
    return ((made / att) * 100).toFixed(1);
  }

  function row(label, a, b, max) {
    const showPercent = label.includes("%");

    const valA = Number(a ?? 0);
    const valB = Number(b ?? 0);

    const MAX_BAR_WIDTH = 30;

    const maxVal = Math.max(valA, valB, 1);

    const widthA = (valA / maxVal) * MAX_BAR_WIDTH;
    const widthB = (valB / maxVal) * MAX_BAR_WIDTH;

    const classA = valA >= valB ? "bar-primary" : "bar-secondary";
    const classB = valB > valA ? "bar-primary" : "bar-secondary";

    return `
          <div class="stat-row">

            <div style="width:60px">
              ${valA}${showPercent ? "%" : ""}
            </div>

            <div class="bar-container">
              <div class="${classA}" style="width:${widthA}%"></div>
            </div>

            <strong>${label}</strong>

            <div class="bar-container">
              <div class="${classB}" style="width:${widthB}%"></div>
            </div>

            <div style="width:60px;text-align:right">
              ${valB}${showPercent ? "%" : ""}
            </div>

          </div>
        `;
  }

  container.innerHTML = `
           ${row("Poeni", tA.points, tB.points, 150)}

           ${row("Šut iz igre pokušaj", tA.fg_attempts, tB.fg_attempts, 120)}
           ${row("Šut iz igre pogodak", tA.fg_made, tB.fg_made, 80)}
           ${row(
             "Šut iz igre %",
             pct(tA.fg_made, tA.fg_attempts),
             pct(tB.fg_made, tB.fg_attempts),
             100,
           )}

           ${row("2 poena šut", tA.two_attempts, tB.two_attempts, 80)}
           ${row("2 poena pogodak", tA.two_made, tB.two_made, 50)}
           ${row(
             "2 poena %",
             pct(tA.two_made, tA.two_attempts),
             pct(tB.two_made, tB.two_attempts),
             100,
           )}

           ${row("3 poena šut", tA.three_attempts, tB.three_attempts, 60)}
           ${row("3 poena pogodak", tA.three_made, tB.three_made, 30)}
           ${row(
             "3 poena %",
             pct(tA.three_made, tA.three_attempts),
             pct(tB.three_made, tB.three_attempts),
             100,
           )}

           ${row(
             "Slobodna bacanja pokušaj",
             tA.ft_attempts,
             tB.ft_attempts,
             50,
           )}
           ${row("Slobodna bacanja pogodak", tA.ft_made, tB.ft_made, 40)}
           ${row(
             "Slobodna bacanja %",
             pct(tA.ft_made, tA.ft_attempts),
             pct(tB.ft_made, tB.ft_attempts),
             100,
           )}

           ${row("Ofanzivni skok", tA.rebounds_off, tB.rebounds_off, 30)}
           ${row("Defanzivni skok", tA.rebounds_def, tB.rebounds_def, 40)}
         ${row(
           "Skok",
           tA.rebounds_off + tA.rebounds_def,
           tB.rebounds_off + tB.rebounds_def,
           70,
         )}

           ${row("Asistencije", tA.assists, tB.assists, 40)}
           ${row("Izgubljene lopte", tA.turnovers, tB.turnovers, 30)}
           ${row("Ukradene lopte", tA.steals, tB.steals, 25)}
           ${row("Blokade", tA.blocks, tB.blocks, 20)}
        `;
}

const btnT = document.getElementById("btnTotals");
const btnP = document.getElementById("btnPlayers");
const btnTimeline = document.getElementById("btnTimeline");
const btnCharts = document.getElementById("btnCharts");

btnT.onclick = () => {
  btnT.classList.add("active");
  btnP.classList.remove("active");
  btnTimeline.classList.remove("active");
  btnCharts.classList.remove("active");

  document.getElementById("teamTotals").style.display = "block";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("timelineContainer").style.display = "none";
  document.getElementById("chartsContainer").style.display = "none";
};

btnP.onclick = () => {
  btnP.classList.add("active");
  btnT.classList.remove("active");
  btnTimeline.classList.remove("active");
  btnCharts.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("statsContainer").style.display = "block";
  document.getElementById("timelineContainer").style.display = "none";
  document.getElementById("chartsContainer").style.display = "none";
};

btnTimeline.onclick = () => {
  btnTimeline.classList.add("active");
  btnP.classList.remove("active");
  btnT.classList.remove("active");
  btnCharts.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("timelineContainer").style.display = "block";
  document.getElementById("chartsContainer").style.display = "none";
};

btnCharts.onclick = () => {
  btnCharts.classList.add("active");
  btnP.classList.remove("active");
  btnT.classList.remove("active");
  btnTimeline.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("timelineContainer").style.display = "none";
  document.getElementById("chartsContainer").style.display = "flex";

  requestAnimationFrame(() => {
    scoreChart?.resize();
    leadChart?.resize();
  });
};
