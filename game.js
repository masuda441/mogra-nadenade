const screens = {
  start: document.querySelector("#start-screen"),
  settings: document.querySelector("#settings-screen"),
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
const characterList = document.querySelector("#character-list");
const characterFileInput = document.querySelector("#character-file-input");
const characterNameDialog = document.querySelector("#character-name-dialog");
const characterNameInput = document.querySelector("#character-name-input");
const characterImages = [...document.querySelectorAll(".title-mole img, [data-head] img")];
const titleCharacterName = document.querySelector("#title-character-name");
const introCharacterName = document.querySelector("#intro-character-name");
const howtoCharacterName = document.querySelector("#howto-character-name");
const howtoCharacterNameSecond = document.querySelector("#howto-character-name-second");
const startButton = document.querySelector("#start-button");
const garden = document.querySelector("#garden");
const descriptionMeta = document.querySelector('meta[name="description"]');
const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');

const DEFAULT_CHARACTER = {
  id: "default",
  name: "モグラ",
  image: "./assets/mole-v2.png",
  custom: false,
};
const CHARACTER_STORAGE_KEY = "mogra-nadenade-characters";
const SELECTED_CHARACTER_KEY = "mogra-nadenade-selected-character";
const MAX_CHARACTERS = 3;

let score = 0;
let activeIndex = -1;
let nextTimer = null;
let soundOn = true;
let audioContext = null;
let stroke = null;
let acceptingStroke = false;
let installPrompt = null;
let pendingCharacterImage = null;
let characters = loadCharacters();
let selectedCharacterId = getStoredValue(SELECTED_CHARACTER_KEY) || "default";

if (!characters.some((character) => character.id === selectedCharacterId)) {
  selectedCharacterId = "default";
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.hidden = key !== name;
  });
}

function getStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadCharacters() {
  try {
    const saved = JSON.parse(getStoredValue(CHARACTER_STORAGE_KEY) || "[]");
    return [DEFAULT_CHARACTER, ...saved.filter((character) => character?.id && character?.image).slice(0, MAX_CHARACTERS - 1)];
  } catch {
    return [DEFAULT_CHARACTER];
  }
}

function saveCharacters() {
  const customCharacters = characters.filter((character) => character.custom);
  if (!setStoredValue(CHARACTER_STORAGE_KEY, JSON.stringify(customCharacters))) {
    throw new Error("character-storage-failed");
  }
}

function getSelectedCharacter() {
  return characters.find((character) => character.id === selectedCharacterId) || DEFAULT_CHARACTER;
}

function applySelectedCharacter() {
  const character = getSelectedCharacter();
  titleCharacterName.textContent = character.name;
  introCharacterName.textContent = character.name;
  howtoCharacterName.textContent = character.name;
  howtoCharacterNameSecond.textContent = character.name;
  startButton.textContent = `${character.name}に会いに行く`;
  garden.setAttribute("aria-label", `${character.name}のお庭`);
  descriptionMeta.content = `${character.name}の頭をやさしくなでて楽しむ、シニア向けブラウザゲームです。`;
  appleTitleMeta.content = `${character.name}ナデナデ`;
  document.title = `${character.name}ナデナデ`;
  characterImages.forEach((image) => {
    image.src = character.image;
    image.classList.toggle("user-character", character.custom);
    if (image.alt) image.alt = `${character.name}のキャラクター`;
  });
}

function selectCharacter(id) {
  selectedCharacterId = id;
  setStoredValue(SELECTED_CHARACTER_KEY, id);
  applySelectedCharacter();
  renderCharacterSettings();
}

function deleteCharacter(id) {
  characters = characters.filter((character) => character.id !== id);
  if (selectedCharacterId === id) selectedCharacterId = "default";
  setStoredValue(SELECTED_CHARACTER_KEY, selectedCharacterId);
  saveCharacters();
  applySelectedCharacter();
  renderCharacterSettings();
}

function renderCharacterSettings() {
  characterList.innerHTML = "";

  characters.forEach((character) => {
    const card = document.createElement("article");
    card.className = `character-card${character.id === selectedCharacterId ? " selected" : ""}`;

    const preview = document.createElement("div");
    preview.className = "character-preview";
    const image = document.createElement("img");
    image.src = character.image;
    image.alt = `${character.name}のプレビュー`;
    image.classList.toggle("user-character", character.custom);
    preview.appendChild(image);

    const info = document.createElement("div");
    info.className = "character-info";
    const name = document.createElement("strong");
    name.textContent = character.name;
    info.appendChild(name);
    if (character.id === selectedCharacterId) {
      const selected = document.createElement("span");
      selected.className = "selected-label";
      selected.textContent = "選択中";
      info.appendChild(selected);
    }

    const actions = document.createElement("div");
    actions.className = "character-actions";
    if (character.id !== selectedCharacterId) {
      const select = document.createElement("button");
      select.className = "select-character";
      select.textContent = "選ぶ";
      select.addEventListener("click", () => selectCharacter(character.id));
      actions.appendChild(select);
    }
    if (character.custom) {
      const remove = document.createElement("button");
      remove.className = "delete-character";
      remove.textContent = "削除";
      remove.addEventListener("click", () => deleteCharacter(character.id));
      actions.appendChild(remove);
    }

    card.append(preview, info, actions);
    characterList.appendChild(card);
  });

  if (characters.length < MAX_CHARACTERS) {
    const add = document.createElement("label");
    add.className = "add-character";
    add.htmlFor = "character-file-input";
    add.tabIndex = 0;
    add.setAttribute("role", "button");
    add.textContent = "＋ 顔写真を登録する";
    add.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        characterFileInput.click();
      }
    });
    characterList.appendChild(add);
  }
}

function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };
    image.src = objectUrl;
  });
}

async function resizePhoto(file) {
  const image = await loadPhoto(file);
  const size = 360;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", .76);
}

function openDialog(dialogElement) {
  if (typeof dialogElement.showModal === "function") {
    dialogElement.showModal();
  } else {
    dialogElement.setAttribute("open", "");
  }
}

function closeDialog(dialogElement) {
  if (typeof dialogElement.close === "function") {
    dialogElement.close();
  } else {
    dialogElement.removeAttribute("open");
  }
}

function startGame() {
  clearTimeout(nextTimer);
  score = 0;
  activeIndex = -1;
  scoreElement.textContent = "0";
  flowers.innerHTML = "";
  progressBar.style.width = "0%";
  messageElement.textContent = `${getSelectedCharacter().name}が出てくるよ`;
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
      messageElement.textContent = `つぎの${getSelectedCharacter().name}はどこかな？`;
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
      ? `${getSelectedCharacter().name}が喜んでいます`
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

startButton.addEventListener("click", startGame);
document.querySelector("#settings-button").addEventListener("click", () => {
  renderCharacterSettings();
  showScreen("settings");
});
document.querySelector("#settings-back-button").addEventListener("click", goHome);
document.querySelector("#again-button").addEventListener("click", startGame);
document.querySelector("#finish-button").addEventListener("click", finishGame);
document.querySelector("#home-button").addEventListener("click", goHome);
document.querySelector("#result-home-button").addEventListener("click", goHome);

const dialog = document.querySelector("#howto-dialog");
document.querySelector("#howto-button").addEventListener("click", () => openDialog(dialog));
document.querySelector("#close-dialog").addEventListener("click", () => closeDialog(dialog));
document.querySelector("#dialog-start").addEventListener("click", () => {
  closeDialog(dialog);
  startGame();
});

characterFileInput.addEventListener("change", async () => {
  const [file] = characterFileInput.files;
  characterFileInput.value = "";
  if (!file || characters.length >= MAX_CHARACTERS) return;

  try {
    pendingCharacterImage = await resizePhoto(file);
    characterNameInput.value = `キャラ${characters.length}`;
    openDialog(characterNameDialog);
    characterNameInput.focus();
    characterNameInput.select();
  } catch {
    alert("写真を読み込めませんでした。別の写真をお試しください。");
  }
});

document.querySelector("#close-name-dialog").addEventListener("click", () => {
  pendingCharacterImage = null;
  closeDialog(characterNameDialog);
});

document.querySelector("#save-character-button").addEventListener("click", () => {
  if (!pendingCharacterImage || characters.length >= MAX_CHARACTERS) return;
  const character = {
    id: `photo-${Date.now()}`,
    name: characterNameInput.value.trim() || `キャラ${characters.length}`,
    image: pendingCharacterImage,
    custom: true,
  };
  characters.push(character);
  try {
    saveCharacters();
  } catch {
    characters.pop();
    alert("写真を保存できませんでした。端末の空き容量をご確認ください。");
    return;
  }
  pendingCharacterImage = null;
  closeDialog(characterNameDialog);
  selectCharacter(character.id);
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

applySelectedCharacter();
