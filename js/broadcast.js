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
    "https://kk-panthers-39d91-default-rtdb.europe-west1.firebasedatabase.app",
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

const gameRef = ref(db, `games/${gameId}`);

let popupTimer = null;
let lastPopupTimestamp = 0;

function showPlayerStats(player, shot) {
  const p = { ...player };

  document.getElementById("playerName").textContent =
    p.name.charAt(0).toUpperCase() + p.name.slice(1);

  document.getElementById("statPTS").textContent = p.points ?? 0;

  const off = p.rebounds_off ?? 0;
  const def = p.rebounds_def ?? 0;
  const total = off + def;
  document.getElementById("statREB").textContent = `${total} (${off} / ${def})`;

  document.getElementById("statAST").textContent = p.assists ?? 0;

  const fgPerc =
    p.fg_attempts > 0 ? Math.round((p.fg_made / p.fg_attempts) * 100) : 0;
  document.getElementById(
    "statFG"
  ).textContent = `${p.fg_made}/${p.fg_attempts} (${fgPerc}%)`;

  document.getElementById("statShotType").textContent = shot;

  let m = 0;
  let a = 0;
  if (shot === "FT") {
    m = p.ft_made ?? 0;
    a = p.ft_attempts ?? 0;
  } else if (shot === "2PT") {
    m = p.two_made ?? 0;
    a = p.two_attempts ?? 0;
  } else if (shot === "3PT") {
    m = p.three_made ?? 0;
    a = p.three_attempts ?? 0;
  }

  const perc = a ? Math.round((m / a) * 100) : 0;
  document.getElementById("statShot").textContent = `${m}/${a} (${perc}%)`;

  document.getElementById("playerPhoto").src = p.photo
    ? "team_logo/" + p.photo
    : "team_logo/default_player.png";

  const popup = document.getElementById("playerStatsPopup");
  popup.classList.add("show");

  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => popup.classList.remove("show"), 5000);
}

let previousPlayerStats = {};
let lastShownShot = null;
let lastScoreEvent = null;

onValue(gameRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const info = data.gameInfo;
  const teams = data.teams;

  const teamA = info.teamA;
  const teamB = info.teamB;

  document.getElementById("teamAName").textContent = teamA
    .substring(0, 3)
    .toUpperCase();
  document.getElementById("teamBName").textContent = teamB
    .substring(0, 3)
    .toUpperCase();

  document.getElementById("teamALogo").src = "team_logo/" + teams[teamA].logo;

  document.getElementById("teamBLogo").src = "team_logo/" + teams[teamB].logo;

  document.getElementById("scoreA").textContent = info.scoreA ?? 0;
  document.getElementById("scoreB").textContent = info.scoreB ?? 0;

  const lastScore = data.lastScore;
  if (!lastScore) return;

  const uniqueShotId = lastScore.timestamp + "_" + lastScore.player;
  if (lastShownShot === uniqueShotId) return;
  lastShownShot = uniqueShotId;

  if (lastScore.stats && ["FT", "2PT", "3PT"].includes(lastScore.shotType)) {
    showPlayerStats(
      {
        ...lastScore.stats,
        name: lastScore.playerName,
        photo:
          teams[lastScore.team]?.players[lastScore.player]?.photo ||
          "default_player.png",
      },
      lastScore.shotType
    );
  }
});
