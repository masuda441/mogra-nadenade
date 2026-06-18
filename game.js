const screens = {
  start: document.querySelector("#start-screen"),
  game: document.querySelector("#game-screen"),
  result: document.querySelector("#result-screen"),
};

const scoreElement = document.querySelector("#score");
const finalScoreElement = document.querySelector("#final-score");
const messageElement = document.querySelector("#message");
const progressBar = document.querySelector("#progress-bar");
const resultMessage = document.querySelector("#result-message");
const flowers = document.querySelector("#flowers");
const moles = [...document.querySelectorAll("[data-mole]")];
const heads = [...document.querySelectorAll("[data-head]")];
const installButton = document.querySelector("#install-button");

let score = 0;
let activeIndex = -1;
let nextTimer = null;
let soundOn = true;
let audioContext = null;
let stroke = null;
let acceptingStroke = false;
let installPrompt = null;

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.hidden = key !== name;
  });
}

function startGame() {
  clearTimeout(nextTimer);
  score = 0;
  activeIndex = -1;
  scoreElement.textContent = "0";
  flowers.innerHTML = "";
  progressBar.style.width = "0%";
  messageElement.textContent = "モグラが出てくるよ";
  moles.forEach((mole) => {
    mole.hidden = true;
    mole.classList.remove("leaving", "mole-happy");
  });
  showScreen("game");
  nextTimer = setTimeout(showMole, 700);
}

function showMole() {
  let next = Math.floor(Math.random() * moles.length);
  if (next === activeIndex) next = (next + 1) % moles.length;
  activeIndex = next;
  acceptingStroke = true;
  const mole = moles[next];
  mole.hidden = false;
  mole.classList.remove("leaving", "mole-happy");
  messageElement.textContent = "やさしく なでてね";
  progressBar.style.width = "0%";
  playTone(420, .08, "sine");
}

function beginStroke(event, index) {
  if (!acceptingStroke || index !== activeIndex) return;
  event.preventDefault();
  heads[index].setPointerCapture?.(event.pointerId);
  stroke = {
    pointerId: event.pointerId,
    lastX: event.clientX,
    distance: 0,
    direction: 0,
    turns: 0,
  };
}

function continueStroke(event, index) {
  if (!stroke || stroke.pointerId !== event.pointerId || index !== activeIndex || !acceptingStroke) return;
  event.preventDefault();
  const dx = event.clientX - stroke.lastX;
  const direction = Math.sign(dx);
  if (Math.abs(dx) >= 2) {
    if (stroke.direction && direction !== stroke.direction) stroke.turns += 1;
    stroke.direction = direction;
    stroke.distance += Math.abs(dx);
    stroke.lastX = event.clientX;
  }
  const progress = Math.min(100, (stroke.distance / 145) * 100 + stroke.turns * 12);
  progressBar.style.width = `${progress}%`;
  if (stroke.distance >= 115 && stroke.turns >= 1) completeStroke();
}

function endStroke(event) {
  if (stroke?.pointerId === event.pointerId) stroke = null;
}

function completeStroke() {
  acceptingStroke = false;
  stroke = null;
  const mole = moles[activeIndex];
  mole.classList.add("mole-happy");
  score += 1;
  scoreElement.textContent = String(score);
  progressBar.style.width = "100%";
  messageElement.textContent = ["ありがとう！", "うれしいな！", "きもちいいな！"][score % 3];
  addFlower();
  playThankYou();
  nextTimer = setTimeout(() => {
    mole.classList.add("leaving");
    nextTimer = setTimeout(() => {
      mole.hidden = true;
      mole.classList.remove("leaving", "mole-happy");
      messageElement.textContent = "つぎのモグラはどこかな";
      nextTimer = setTimeout(showMole, 650);
    }, 520);
  }, 1100);
}

function addFlower() {
  const flower = document.createElement("span");
  flower.className = "flower";
  flower.textContent = ["🌼", "🌷", "🌸", "🌻"][score % 4];
  flower.style.left = `${8 + ((score * 23) % 82)}%`;
  flower.style.animationDelay = `${(score % 3) * .05}s`;
  flowers.appendChild(flower);
}

function finishGame() {
  clearTimeout(nextTimer);
  acceptingStroke = false;
  finalScoreElement.textContent = String(score);
  resultMessage.textContent = score === 0
    ? "会いに来てくれて、ありがとう"
    : score < 4
      ? "モグラたちが喜んでいます"
      : "お庭が笑顔でいっぱいになりました";
  showScreen("result");
  playTone(523, .12, "sine", 0);
  playTone(659, .12, "sine", .14);
  playTone(784, .22, "sine", .28);
}

function goHome() {
  clearTimeout(nextTimer);
  acceptingStroke = false;
  showScreen("start");
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
  return audioContext;
}

function playTone(frequency, duration, type = "sine", delay = 0) {
  if (!soundOn) return;
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(.09, start + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .03);
}

function playThankYou() {
  playTone(659, .12, "sine", 0);
  playTone(784, .18, "sine", .13);
}

heads.forEach((head, index) => {
  head.addEventListener("pointerdown", (event) => beginStroke(event, index));
  head.addEventListener("pointermove", (event) => continueStroke(event, index));
  head.addEventListener("pointerup", endStroke);
  head.addEventListener("pointercancel", endStroke);
});

document.querySelector("#start-button").addEventListener("click", startGame);
document.querySelector("#again-button").addEventListener("click", startGame);
document.querySelector("#finish-button").addEventListener("click", finishGame);
document.querySelector("#home-button").addEventListener("click", goHome);
document.querySelector("#result-home-button").addEventListener("click", goHome);

const dialog = document.querySelector("#howto-dialog");
document.querySelector("#howto-button").addEventListener("click", () => dialog.showModal());
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#dialog-start").addEventListener("click", () => {
  dialog.close();
  startGame();
});

document.querySelector("#sound-button").addEventListener("click", (event) => {
  soundOn = !soundOn;
  event.currentTarget.textContent = soundOn ? "♪" : "×";
  event.currentTarget.setAttribute("aria-pressed", String(soundOn));
  event.currentTarget.setAttribute("aria-label", soundOn ? "音を切る" : "音を出す");
  if (soundOn) playTone(659, .12);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
