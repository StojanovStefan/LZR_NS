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

function copyBroadcastLink() {
  const basePath = "/LZR_NS";
  const link = `${window.location.origin}${basePath}/broadcast.html?id=${gameId}`;

  navigator.clipboard
    .writeText(link)
    .then(() => {
      showTemporaryNotification("Link za live broadcast kopiran!");
    })
    .catch((err) => {
      console.error("Neuspešno kopiranje linka:", err);
      showTemporaryNotification("Greška pri kopiranju linka!");
    });
}

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

function renderGameHeader(info) {
  if (!info || !info.teamA || !info.teamB) {
    document.getElementById("gameHeader").innerHTML =
      "<p>Podaci o utakmici nisu dostupni.</p>";
    return;
  }

  const container = document.getElementById("gameHeader");

  const date = info.date || "";
  const startTime = info.startTime || "";

  let mvpHtml = "";
  if (
    info.status === "finished" &&
    globalTeams[info.teamA] &&
    globalTeams[info.teamB]
  ) {
    const scoreA = info.scoreA ?? 0;
    const scoreB = info.scoreB ?? 0;
    const winnerTeam = scoreA >= scoreB ? info.teamA : info.teamB;

    const players = globalTeams[winnerTeam].players || {};
    let bestPlayer = null;
    let bestPlayerId = null;
    let maxEff = -Infinity;

    for (const number in players) {
      const p = players[number];
      const s = p.stats || {};
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

      if (eff > maxEff) {
        maxEff = eff;
        bestPlayer = {
          playerId: p.playerId,
          name: p.name,
          photo: p.photo || "default_player.png",
        };
      }
    }

    if (bestPlayer) {
      mvpHtml = `
      <div class="mvp-block">
        <div class="mvp-title">Igrač utakmice</div>
         <div class="mvp-player" style="cursor:pointer;" 
           onclick="window.location.href='playerProfile.html?id=${
             bestPlayer.playerId
           }'">
          <img src="team_logo/${
            bestPlayer.photo || "default_player.png"
          }" alt="${bestPlayer.name}">
          <div class="mvp-player-name">
            ${bestPlayer.name}&nbsp; <span>${maxEff} (+/-)</span>
          </div>
        </div>
      </div>`;
    }
  }

  container.innerHTML = `
  <div class="game-header">
    <div class="game-info">
      📍 ${info.location || "Nepoznato"} •
      📅 ${date} •
      🕒 ${startTime} •
      <span class="live-broadcast">🎦</span> •
      ${info.ytLink ? '<span class="yt-broadcast">📺</span>' : ""}
    </div>

    <div class="teams">
      <div class="team-block">
         <img 
      src="team_logo/${info.teamA_logo || "default.png"}" 
      class="big-logo"
      onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${
        info.teamA
      }'"
    >
        <div class="team-name-large">${info.teamA}</div>
      </div>

      <div class="score-big-container">
  ${
    info.status === "finished"
      ? '<div class="final-result-text">Konačni rezultat</div>'
      : ""
  }
  <div class="score-big">${info.scoreA ?? "-"} : ${info.scoreB ?? "-"}</div>
</div>

      <div class="team-block">
       <img 
      src="team_logo/${info.teamB_logo || "default.png"}" 
      class="big-logo"
      onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${
        info.teamB
      }'"
    >
        <div class="team-name-large">${info.teamB}</div>
      </div>
    </div>

    ${mvpHtml}
  </div>
  `;

  const broadcastIcon = container.querySelector(".live-broadcast");
  if (broadcastIcon) {
    broadcastIcon.addEventListener("click", copyBroadcastLink);
  }

  const YTbroadcastIcon = container.querySelector(".yt-broadcast");
  if (YTbroadcastIcon && info.ytLink) {
    YTbroadcastIcon.addEventListener("click", () => {
      window.open(info.ytLink, "_blank");
    });
  }
}

function tryRenderAll() {
  if (gameInfo && Object.keys(globalTeams).length) {
    renderStats(globalTeams);
    renderTotals(globalTeams);
    renderGameHeader(gameInfo);
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
      (a, b) => (a.number || 0) - (b.number || 0)
    );

    const div = document.createElement("div");
    div.className = "teamStats";

    const h2 = document.createElement("h2");
    const headerDiv = document.createElement("div");
    headerDiv.className = "team-header";

    const logo = document.createElement("img");
    logo.src = "team_logo/" + (team.logo || "default.png");

    logo.style.cursor = "pointer";
    logo.onclick = () => {
      window.location.href = `teamProfile.html?id=${teamName}`;
    };

    headerDiv.appendChild(logo);
    headerDiv.appendChild(document.createTextNode(teamName));
    h2.appendChild(headerDiv);
    div.appendChild(h2);

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
      tdThree.textContent = `${s.three_made || 0}/${
        s.three_attempts || 0
      } ${threePct}`;
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
  const events = snap.val() || {};
  renderTimeline(events);
});

function renderTimeline(events) {
  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";

  const sortedEvents = Object.values(events).sort(
    (a, b) => a.timestamp - b.timestamp
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
            <div class="event-text">
              <div class="event-player">${ev.playerName} ${""}</div>
              <div class="event-type">${text}</div>
            </div>
          `;

    container.appendChild(div);
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
             100
           )}

           ${row("2 poena šut", tA.two_attempts, tB.two_attempts, 80)}
           ${row("2 poena pogodak", tA.two_made, tB.two_made, 50)}
           ${row(
             "2 poena %",
             pct(tA.two_made, tA.two_attempts),
             pct(tB.two_made, tB.two_attempts),
             100
           )}

           ${row("3 poena šut", tA.three_attempts, tB.three_attempts, 60)}
           ${row("3 poena pogodak", tA.three_made, tB.three_made, 30)}
           ${row(
             "3 poena %",
             pct(tA.three_made, tA.three_attempts),
             pct(tB.three_made, tB.three_attempts),
             100
           )}

           ${row(
             "Slobodna bacanja pokušaj",
             tA.ft_attempts,
             tB.ft_attempts,
             50
           )}
           ${row("Slobodna bacanja pogodak", tA.ft_made, tB.ft_made, 40)}
           ${row(
             "Slobodna bacanja %",
             pct(tA.ft_made, tA.ft_attempts),
             pct(tB.ft_made, tB.ft_attempts),
             100
           )}

           ${row("Ofanzivni skok", tA.rebounds_off, tB.rebounds_off, 30)}
           ${row("Defanzivni skok", tA.rebounds_def, tB.rebounds_def, 40)}
         ${row(
           "Skok",
           tA.rebounds_off + tA.rebounds_def,
           tB.rebounds_off + tB.rebounds_def,
           70
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

btnT.onclick = () => {
  btnT.classList.add("active");
  btnP.classList.remove("active");
  btnTimeline.classList.remove("active");

  document.getElementById("teamTotals").style.display = "block";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("timelineContainer").style.display = "none";
};

btnP.onclick = () => {
  btnP.classList.add("active");
  btnT.classList.remove("active");
  btnTimeline.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("statsContainer").style.display = "block";
  document.getElementById("timelineContainer").style.display = "none";
};

btnTimeline.onclick = () => {
  btnTimeline.classList.add("active");
  btnP.classList.remove("active");
  btnT.classList.remove("active");

  document.getElementById("teamTotals").style.display = "none";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("timelineContainer").style.display = "block";
};
