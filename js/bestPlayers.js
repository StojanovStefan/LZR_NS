import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBrMu0mjZw1SIh-0KgEVaKoPURd1NPhC0w",
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

const container = document.getElementById("bestPlayersContainer");

const gamesRef = ref(db, "games");

get(gamesRef)
  .then((snapshot) => {
    if (!snapshot.exists()) {
      container.innerHTML = "<p>Nema dostupnih utakmica.</p>";
      return;
    }

    const games = snapshot.val();
    const playersMap = {};

    Object.entries(games).forEach(([gameID, game]) => {
      const info = game.gameInfo || {};

      // Uzimamo samo završene utakmice
      if (info.status !== "finished") return;

      const teams = game.teams || {};

      // MVP i LVP igrači za ovu utakmicu
      const mvpPlayerIds = Array.isArray(info.mvpPlayerIds)
        ? info.mvpPlayerIds
        : [];

      const lvpPlayerIds = Array.isArray(info.lvpPlayerIds)
        ? info.lvpPlayerIds
        : [];

      // Prolazimo kroz igrače obe ekipe
      Object.entries(teams).forEach(([teamID, team]) => {
        const players = team.players || {};

        Object.entries(players).forEach(([playerID, player]) => {
          const isMVP = mvpPlayerIds.includes(playerID);
          const isLVP = lvpPlayerIds.includes(playerID);

          // Prikazujemo samo igrače koji imaju MVP ili LVP
          if (!isMVP && !isLVP) return;

          if (!playersMap[playerID]) {
            const teamLogo =
              teamID === info.teamA ? info.teamA_logo : info.teamB_logo;

            playersMap[playerID] = {
              id: playerID,
              name: player.name || "Nepoznat igrač",
              photo: player.photo || "",
              team: teamID,
              logo: teamLogo || "",
              mvp: 0,
              lvp: 0,
            };
          }

          if (isMVP) {
            playersMap[playerID].mvp++;
          }

          if (isLVP) {
            playersMap[playerID].lvp++;
          }
        });
      });
    });

    const players = Object.values(playersMap);

    // Sortiranje:
    // 1. Najviše MVP
    // 2. Najviše LVP
    players.sort((a, b) => {
      if (b.mvp !== a.mvp) {
        return b.mvp - a.mvp;
      }

      return b.lvp - a.lvp;
    });

    renderPlayers(players);
  })
  .catch((error) => {
    console.error("Greška pri učitavanju igrača:", error);
    container.innerHTML = "<p>Došlo je do greške pri učitavanju podataka.</p>";
  });

function renderPlayers(players) {
  if (!players.length) {
    container.innerHTML =
      "<p>Još uvek nema igrača sa MVP ili LVP priznanjima.</p>";
    return;
  }

  container.innerHTML = "";

  players.forEach((player, index) => {
    const photo = player.photo
      ? `team_logo/${player.photo}`
      : "team_logo/default_player.png";

    const logo = player.logo
      ? `team_logo/${player.logo}`
      : "team_logo/default.png";

    const card = document.createElement("div");
    card.className = "best-player-card";

    card.innerHTML = `
      <div class="best-player-rank">
        ${index + 1}
      </div>

      <img
        class="best-player-photo"
        src="${photo}"
        onerror="this.src='team_logo/default_player.png'"
      >

      <div class="best-player-info">
        <div class="best-player-name">
          ${player.name}
        </div>

        <div class="best-player-team">
          <img
            class="best-player-team-logo"
            src="${logo}"
            onerror="this.src='team_logo/default.png'"
          >
          <span>${player.team}</span>
        </div>

        <div class="best-player-awards">
          <div class="best-player-mvp">
            🏆 MVP: ${player.mvp}
          </div>

          <div class="best-player-lvp">
            🥈 LVP: ${player.lvp}
          </div>
        </div>
      </div>
    `;

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      window.location.href = `playerProfile.html?id=${encodeURIComponent(player.id)}`;
    });

    container.appendChild(card);
  });
}
