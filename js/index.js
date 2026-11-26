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
  measurementId: "G-KL6BJPX04S",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const gamesRef = ref(db, "games");

get(gamesRef).then((snapshot) => {
  if (!snapshot.exists()) {
    document.getElementById("gamesList").innerHTML = "<p>No games found.</p>";
    return;
  }

  const games = snapshot.val();
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

  const list = document.getElementById("gamesList");

  gameKeys.forEach((key) => {
    const game = games[key];
    const info = game.gameInfo || {};

    const teamA = info.teamA || "Team A";
    const teamB = info.teamB || "Team B";

    const logoA = info.teamA_logo;
    const logoB = info.teamB_logo;

    const scoreA = info.scoreA ?? "-";
    const scoreB = info.scoreB ?? "-";

    const date = info.date || key.split("_")[0];
    const startTime = info.startTime || "";
    const location = info.location || "";
    const season = info.season || "";
    const league = info.league || "";

    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => {
      window.location.href = `stats.html?id=${key}`;
    };

    card.innerHTML = `
          <div class="left-info">
            <div class="date-time">📅 ${date} • 🕒 ${startTime}</div>
            <div>📍 ${location}</div>
            <div>${league}</div>
            <div>${season}</div>
          </div>

          <div class="center-content">
            <div class="teams-row">
              <div class="team">
                  <img style="cursor:pointer;" src="team_logo/${logoA}"
                        onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${teamA}'">
                <span>${teamA}</span>
              </div>

              <div class="score">${scoreA} : ${scoreB}</div>

              <div class="team">
                <img  style="cursor:pointer;" src="team_logo/${logoB}"
                      onclick="event.stopPropagation(); window.location.href='teamProfile.html?id=${teamB}'">
                <span>${teamB}</span>
              </div>
            </div>

          </div>
        `;

    list.appendChild(card);
  });
});
