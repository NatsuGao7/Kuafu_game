// 画布 & 上下文
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI 元素
const menuScreen = document.getElementById("menuScreen");
const helpScreen = document.getElementById("helpScreen");
const storyScreen = document.getElementById("storyScreen");
const pauseScreen = document.getElementById("pauseScreen");

const btnStart = document.getElementById("btnStart");
const btnHelp = document.getElementById("btnHelp");
const btnStory = document.getElementById("btnStory");
const btnBackFromHelp = document.getElementById("btnBackFromHelp");
const btnBackFromStory = document.getElementById("btnBackFromStory");

const btnPause = document.getElementById("btnPause");
const btnResume = document.getElementById("btnResume");
const btnRestart = document.getElementById("btnRestart");
const btnBackToMenu = document.getElementById("btnBackToMenu");

const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const difficultyTip = document.getElementById("difficultyTip");

// ---------------------
// 难度配置
// ---------------------
let currentDifficulty = "normal";

const difficultyConfigs = {
  normal: {
    label: "普通 · 适合第一次体验的小玩家",
    worldSpeed: 320,
    staminaDecayRate: 5,
    hitPenalty: 12,
    waterGain: 15,
    obstacleMinInterval: 0.9,
    obstacleMaxInterval: 2.0,
    waterMinInterval: 1.2,
    waterMaxInterval: 3.0,
    distanceRate: 45,
  },
  hard: {
    label: "困难 · 跑得更快、体力消耗更快",
    worldSpeed: 380,
    staminaDecayRate: 6.5,
    hitPenalty: 15,
    waterGain: 13,
    obstacleMinInterval: 0.8,
    obstacleMaxInterval: 1.6,
    waterMinInterval: 1.1,
    waterMaxInterval: 2.5,
    distanceRate: 50,
  },
  hell: {
    label: "地狱 · 超高速奔跑，考验极限反应",
    worldSpeed: 450,
    staminaDecayRate: 8.0,
    hitPenalty: 18,
    waterGain: 12,
    obstacleMinInterval: 0.6,
    obstacleMaxInterval: 1.4,
    waterMinInterval: 1.0,
    waterMaxInterval: 2.2,
    distanceRate: 55,
  },
};

// 当前游戏参数（会随难度改变）
const GROUND_HEIGHT = 80;
const GROUND_Y = canvas.height - GROUND_HEIGHT;
const GRAVITY = 2000;
const INITIAL_DISTANCE = 1000;
const MAX_STAMINA = 100;
const JUMP_SPEED = -900;

let WORLD_SPEED = 320;
let STAMINA_DECAY_RATE = 5;
let STAMINA_HIT_PENALTY = 12;
let STAMINA_WATER_GAIN = 15;
let OBSTACLE_MIN_INTERVAL = 0.9;
let OBSTACLE_MAX_INTERVAL = 2.0;
let WATER_MIN_INTERVAL = 1.2;
let WATER_MAX_INTERVAL = 3.0;
let DISTANCE_REDUCE_RATE = 45;

function applyDifficultyConfig() {
  const cfg = difficultyConfigs[currentDifficulty];
  WORLD_SPEED = cfg.worldSpeed;
  STAMINA_DECAY_RATE = cfg.staminaDecayRate;
  STAMINA_HIT_PENALTY = cfg.hitPenalty;
  STAMINA_WATER_GAIN = cfg.waterGain;
  OBSTACLE_MIN_INTERVAL = cfg.obstacleMinInterval;
  OBSTACLE_MAX_INTERVAL = cfg.obstacleMaxInterval;
  WATER_MIN_INTERVAL = cfg.waterMinInterval;
  WATER_MAX_INTERVAL = cfg.waterMaxInterval;
  DISTANCE_REDUCE_RATE = cfg.distanceRate;

  if (difficultyTip) {
    difficultyTip.textContent = `当前难度：${cfg.label}`;
  }
}

// 难度按钮事件
difficultyButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    difficultyButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.difficulty;
    applyDifficultyConfig();
  });
});

// ---------------------
// 音效
// ---------------------
// 如果你坚持用绝对路径，把 audioBase 改成类似：
// const audioBase = "/Users/zhuangzhigao/Desktop/kuafu/audio/";
const audioBase = "./audio/";

const jumpAudio = new Audio(audioBase + "jump.mp3");
const drinkAudio = new Audio(audioBase + "drink.mp3");
const hitAudio = new Audio(audioBase + "hit.mp3");
const victoryAudio = new Audio(audioBase + "victory.mp3");
const failureAudio = new Audio(audioBase + "failure.mp3");
const bgAudio = new Audio(audioBase + "bg.mp3");

bgAudio.loop = true;
bgAudio.volume = 0.4;

jumpAudio.volume = 0.9;
drinkAudio.volume = 0.9;
hitAudio.volume = 0.9;
victoryAudio.volume = 0.9;
failureAudio.volume = 0.9;

function playSound(audio, { reset = true } = {}) {
  if (!audio) return;
  try {
    if (reset) audio.currentTime = 0;
    audio.play().catch(() => {
      // 某些浏览器可能阻止自动播放，这里忽略错误
    });
  } catch (e) {
    // ignore
  }
}

function startBgMusic() {
  try {
    if (bgAudio.paused) {
      bgAudio.play().catch(() => {});
    }
  } catch (e) {}
}

function stopBgMusic(reset = false) {
  try {
    bgAudio.pause();
    if (reset) bgAudio.currentTime = 0;
  } catch (e) {}
}

// ---------------------
// 覆盖层显示控制
// ---------------------
function hideAllScreens() {
  menuScreen.classList.add("hidden");
  helpScreen.classList.add("hidden");
  storyScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
}

function showMenu() {
  hideAllScreens();
  menuScreen.classList.remove("hidden");
  isRunning = false;
  gameState = "idle";
  btnPause.classList.add("hidden");
  stopBgMusic(true);
}

function showHelp() {
  hideAllScreens();
  helpScreen.classList.remove("hidden");
  isRunning = false;
  btnPause.classList.add("hidden");
}

function showStory() {
  hideAllScreens();
  storyScreen.classList.remove("hidden");
  isRunning = false;
  btnPause.classList.add("hidden");
}

function showPauseMenu() {
  if (gameState !== "playing") return;
  pauseScreen.classList.remove("hidden");
  gameState = "paused";
  isRunning = false;
  stopBgMusic(false);
}

function overlaysVisible() {
  return (
    !menuScreen.classList.contains("hidden") ||
    !helpScreen.classList.contains("hidden") ||
    !storyScreen.classList.contains("hidden") ||
    !pauseScreen.classList.contains("hidden")
  );
}

// 按钮事件
btnStart.addEventListener("click", () => {
  startGame();
});

btnHelp.addEventListener("click", () => {
  showHelp();
});

btnStory.addEventListener("click", () => {
  showStory();
});

btnBackFromHelp.addEventListener("click", () => {
  showMenu();
});

btnBackFromStory.addEventListener("click", () => {
  showMenu();
});

btnPause.addEventListener("click", () => {
  showPauseMenu();
});

btnResume.addEventListener("click", () => {
  pauseScreen.classList.add("hidden");
  gameState = "playing";
  isRunning = true;
  lastTime = performance.now();
  startBgMusic();
});

btnRestart.addEventListener("click", () => {
  pauseScreen.classList.add("hidden");
  startGame();
});

btnBackToMenu.addEventListener("click", () => {
  pauseScreen.classList.add("hidden");
  showMenu();
});

// ---------------------
// 游戏状态 & 变量
// ---------------------
let gameState = "idle"; // idle | playing | win | gameover | paused
let isRunning = false;
let lastTime = 0;

let stamina = MAX_STAMINA;
let distanceToSun = INITIAL_DISTANCE;

let obstacleTimer = 0;
let obstacleInterval = OBSTACLE_MIN_INTERVAL;
let waterTimer = 0;
let waterInterval = WATER_MIN_INTERVAL;

const obstacles = [];
const waters = [];

const player = {
  x: 120,
  y: GROUND_Y - 120,
  width: 60,
  height: 110,
  vy: 0,
  isOnGround: true,
};

// ---------------------
// 工具函数
// ---------------------
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetPlayer() {
  player.x = 120;
  player.y = GROUND_Y - 120;
  player.width = 60;
  player.height = 110;
  player.vy = 0;
  player.isOnGround = true;
}

// ---------------------
// 角色更新 & 绘制
// ---------------------
function updatePlayer(dt) {
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  const groundTop = GROUND_Y;
  if (player.y + player.height > groundTop) {
    player.y = groundTop - player.height;
    player.vy = 0;
    player.isOnGround = true;
  } else {
    player.isOnGround = false;
  }
}

function drawPlayer() {
  const bodyX = player.x;
  const bodyY = player.y + 30;
  const bodyW = player.width;
  const bodyH = player.height - 30;

  // 阴影
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(
    player.x + player.width / 2,
    GROUND_Y + 10,
    player.width * 0.7,
    12,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // 身体
  const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  bodyGrad.addColorStop(0, "#f5a623");
  bodyGrad.addColorStop(1, "#d86b19");
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 12);
  ctx.fill();

  // 头
  const headX = player.x + player.width / 2;
  const headY = player.y + 20;
  ctx.beginPath();
  ctx.arc(headX, headY, 24, 0, Math.PI * 2);
  const headGrad = ctx.createRadialGradient(
    headX - 10, headY - 10, 4,
    headX, headY, 30
  );
  headGrad.addColorStop(0, "#ffe0b2");
  headGrad.addColorStop(1, "#f4a261");
  ctx.fillStyle = headGrad;
  ctx.fill();

  // 眼睛
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(headX - 8, headY - 4, 3, 0, Math.PI * 2);
  ctx.arc(headX + 8, headY - 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // 嘴
  ctx.beginPath();
  ctx.moveTo(headX - 8, headY + 8);
  ctx.quadraticCurveTo(headX, headY + 14, headX + 8, headY + 8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#7f3b00";
  ctx.stroke();

  // 木杖
  ctx.strokeStyle = "#5b3a1a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(player.x + bodyW + 8, bodyY + 10);
  ctx.lineTo(player.x + bodyW + 8, bodyY + bodyH + 10);
  ctx.stroke();

  // 葫芦
  ctx.beginPath();
  ctx.arc(bodyX - 12, bodyY + 26, 12, 0, Math.PI * 2);
  ctx.arc(bodyX - 8, bodyY + 46, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#f4d35e";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bodyX - 6, bodyY + 30);
  ctx.lineTo(bodyX - 4, bodyY + 24);
  ctx.strokeStyle = "#8d6e00";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---------------------
// 障碍物 & 水滴
// ---------------------
function spawnObstacle() {
  const type = Math.random() < 0.6 ? "rock" : "fire";
  const width = type === "rock" ? randomRange(40, 70) : 40;
  const height = type === "rock" ? randomRange(40, 60) : 55;

  obstacles.push({
    type,
    x: canvas.width + randomRange(0, 80),
    y: GROUND_Y - height,
    width,
    height,
  });
}

function spawnWater() {
  const size = 36;
  waters.push({
    x: canvas.width + randomRange(40, 160),
    y: GROUND_Y - size - randomRange(40, 80),
    width: size,
    height: size,
  });
}

function updateObstaclesAndWaters(dt) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= WORLD_SPEED * dt;
    if (o.x + o.width < -50) obstacles.splice(i, 1);
  }
  for (let i = waters.length - 1; i >= 0; i--) {
    const w = waters[i];
    w.x -= WORLD_SPEED * dt;
    if (w.x + w.width < -50) waters.splice(i, 1);
  }

  obstacleTimer += dt;
  if (obstacleTimer >= obstacleInterval) {
    spawnObstacle();
    obstacleTimer = 0;
    obstacleInterval = randomRange(OBSTACLE_MIN_INTERVAL, OBSTACLE_MAX_INTERVAL);
  }

  waterTimer += dt;
  if (waterTimer >= waterInterval) {
    spawnWater();
    waterTimer = 0;
    waterInterval = randomRange(WATER_MIN_INTERVAL, WATER_MAX_INTERVAL);
  }
}

function drawObstacles() {
  obstacles.forEach(o => {
    if (o.type === "rock") drawRock(o);
    else drawFire(o);
  });
}

function drawRock(o) {
  ctx.save();
  ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
  ctx.scale(o.width / 60, o.height / 50);

  const rockGrad = ctx.createRadialGradient(0, -10, 5, 0, 0, 40);
  rockGrad.addColorStop(0, "#d7d7d7");
  rockGrad.addColorStop(1, "#828282");
  ctx.fillStyle = rockGrad;

  ctx.beginPath();
  ctx.moveTo(-28, 10);
  ctx.lineTo(-18, -12);
  ctx.lineTo(0, -20);
  ctx.lineTo(20, -8);
  ctx.lineTo(26, 12);
  ctx.lineTo(18, 20);
  ctx.lineTo(-16, 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawFire(o) {
  ctx.save();
  ctx.translate(o.x + o.width / 2, o.y + o.height);

  const fireGrad = ctx.createLinearGradient(0, -o.height, 0, 0);
  fireGrad.addColorStop(0, "#ffeb3b");
  fireGrad.addColorStop(0.5, "#ff9800");
  fireGrad.addColorStop(1, "#f44336");
  ctx.fillStyle = fireGrad;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-18, -10, -10, -34, 0, -o.height);
  ctx.bezierCurveTo(12, -34, 18, -10, 0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -o.height * 0.3);
  ctx.bezierCurveTo(-6, -o.height * 0.45, -3, -o.height * 0.65, 0, -o.height * 0.8);
  ctx.bezierCurveTo(4, -o.height * 0.65, 6, -o.height * 0.45, 0, -o.height * 0.3);
  ctx.closePath();
  ctx.fillStyle = "#fff9c4";
  ctx.fill();

  ctx.restore();
}

function drawWaters() {
  waters.forEach(w => drawWaterDrop(w));
}

function drawWaterDrop(w) {
  ctx.save();
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  const r = w.width / 2;

  const grad = ctx.createRadialGradient(cx - 4, cy - 6, 4, cx, cy, r);
  grad.addColorStop(0, "#e0f7fa");
  grad.addColorStop(0.5, "#4dd0e1");
  grad.addColorStop(1, "#007c91");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r, cy - r * 0.3, cx + r, cy + r * 0.4, cx, cy + r);
  ctx.bezierCurveTo(cx - r, cy + r * 0.4, cx - r, cy - r * 0.3, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------
// 碰撞检测
// ---------------------
function rectIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

function handleCollisions() {
  // 障碍物
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (rectIntersect(player, o)) {
      stamina -= STAMINA_HIT_PENALTY;
      stamina = clamp(stamina, 0, MAX_STAMINA);
      obstacles.splice(i, 1);
      playSound(hitAudio);
    }
  }

  // 水滴
  for (let i = waters.length - 1; i >= 0; i--) {
    const w = waters[i];
    if (rectIntersect(player, w)) {
      stamina += STAMINA_WATER_GAIN;
      stamina = clamp(stamina, 0, MAX_STAMINA);
      waters.splice(i, 1);
      playSound(drinkAudio);
    }
  }
}

// ---------------------
// 背景 & UI
// ---------------------
function drawBackground() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#87ceeb");
  skyGrad.addColorStop(0.5, "#fbe9a1");
  skyGrad.addColorStop(1, "#f4a261");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMountain(120, GROUND_Y + 20, 260, "#f1c27d");
  drawMountain(420, GROUND_Y + 30, 340, "#f2a65a");
  drawMountain(780, GROUND_Y + 10, 280, "#f6c28b");

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, canvas.height);
  groundGrad.addColorStop(0, "#e0c085");
  groundGrad.addColorStop(1, "#c49a6c");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, canvas.width, GROUND_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_Y + 10);
    ctx.lineTo(i + 40, GROUND_Y + 20);
    ctx.stroke();
  }

  drawSun();
}

function drawMountain(centerX, baseY, width, color) {
  const height = width * 0.6;
  ctx.beginPath();
  ctx.moveTo(centerX - width / 2, baseY);
  ctx.lineTo(centerX, baseY - height);
  ctx.lineTo(centerX + width / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSun() {
  const progress = 1 - distanceToSun / INITIAL_DISTANCE;
  const baseX = canvas.width - 130;
  const baseY = 90;
  const offsetX = -progress * 80;
  const x = baseX + offsetX;
  const y = baseY;

  const sunGrad = ctx.createRadialGradient(x, y, 10, x, y, 60);
  sunGrad.addColorStop(0, "rgba(255,255,255,0.9)");
  sunGrad.addColorStop(0.4, "#ffe066");
  sunGrad.addColorStop(1, "rgba(255,165,0,0)");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(x, y, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fillStyle = "#ffca28";
  ctx.fill();

  ctx.fillStyle = "#8d6e63";
  ctx.beginPath();
  ctx.arc(x - 10, y - 6, 4, 0, Math.PI * 2);
  ctx.arc(x + 10, y - 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 6);
  ctx.quadraticCurveTo(x, y + 16, x + 12, y + 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#8d6e63";
  ctx.stroke();
}

function drawUI() {
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  roundRect(ctx, 20, 16, 320, 60, 12);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.font = "14px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("体力", 34, 38);

  const barX = 80;
  const barY = 28;
  const barW = 220;
  const barH = 12;
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  roundRect(ctx, barX, barY, barW, barH, 6);
  ctx.fill();

  const ratio = stamina / MAX_STAMINA;
  const filledW = barW * ratio;
  let color = "#4caf50";
  if (ratio < 0.35) color = "#f44336";
  else if (ratio < 0.7) color = "#ff9800";

  const grad = ctx.createLinearGradient(barX, barY, barX + filledW, barY);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  roundRect(ctx, barX, barY, filledW, barH, 6);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${Math.round(stamina)} / ${MAX_STAMINA}`, barX, barY + barH + 4);

  const distPanelX = 20;
  const distPanelY = 16 + 60 + 8;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  roundRect(ctx, distPanelX, distPanelY, 220, 40, 10);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.font = "14px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("距离太阳还差：", distPanelX + 12, distPanelY + 20);
  ctx.fillStyle = "#ff6f00";
  ctx.font = "18px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.max(0, Math.round(distanceToSun))} 米`, distPanelX + 200, distPanelY + 20);
}

function drawGameMessage() {
  if (gameState !== "win" && gameState !== "gameover") return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelW = 420;
  const panelH = 200;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = (canvas.height - panelH) / 2;

  ctx.fillStyle = "#fffaf0";
  roundRect(ctx, panelX, panelY, panelW, panelH, 20);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (gameState === "win") {
    ctx.fillStyle = "#ff9800";
    ctx.font = "28px system-ui";
    ctx.fillText("夸父追上了太阳！", canvas.width / 2, panelY + 50);

    ctx.fillStyle = "#444";
    ctx.font = "16px system-ui";
    ctx.fillText("他为大家带来了光和热。", canvas.width / 2, panelY + 90);
    ctx.fillText("夸父追日讲的是勇敢和坚持的精神。", canvas.width / 2, panelY + 120);
  } else {
    ctx.fillStyle = "#d32f2f";
    ctx.font = "28px system-ui";
    ctx.fillText("夸父太渴了，没能追上太阳……", canvas.width / 2, panelY + 50);

    ctx.fillStyle = "#444";
    ctx.font = "16px system-ui";
    ctx.fillText("再试一次吧！多收集一点水滴！", canvas.width / 2, panelY + 100);
  }

  ctx.fillStyle = "#333";
  ctx.font = "14px system-ui";
  ctx.fillText("按 空格 / 点击鼠标 重新开始", canvas.width / 2, panelY + 155);

  ctx.restore();
}

// 圆角矩形
function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radius);
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

// ---------------------
// 游戏主循环
// ---------------------
function resetGame() {
  stamina = MAX_STAMINA;
  distanceToSun = INITIAL_DISTANCE;
  obstacles.length = 0;
  waters.length = 0;
  obstacleTimer = 0;
  waterTimer = 0;
  obstacleInterval = randomRange(OBSTACLE_MIN_INTERVAL, OBSTACLE_MAX_INTERVAL);
  waterInterval = randomRange(WATER_MIN_INTERVAL, WATER_MAX_INTERVAL);
  resetPlayer();
  gameState = "playing";
}

function update(dt) {
  if (!isRunning || gameState !== "playing") return;

  updatePlayer(dt);
  updateObstaclesAndWaters(dt);

  stamina -= STAMINA_DECAY_RATE * dt;
  stamina = clamp(stamina, 0, MAX_STAMINA);

  distanceToSun -= DISTANCE_REDUCE_RATE * dt;
  distanceToSun = clamp(distanceToSun, 0, INITIAL_DISTANCE);

  handleCollisions();

  if (stamina <= 0) {
    stamina = 0;
    gameState = "gameover";
    isRunning = false;
    playSound(failureAudio);
    stopBgMusic(false);
  } else if (distanceToSun <= 0) {
    distanceToSun = 0;
    gameState = "win";
    isRunning = false;
    playSound(victoryAudio);
    stopBgMusic(false);
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawWaters();
  drawPlayer();
  drawUI();
  drawGameMessage();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function startGame() {
  hideAllScreens();
  applyDifficultyConfig();
  resetGame();
  isRunning = true;
  lastTime = performance.now();
  btnPause.classList.remove("hidden");
  startBgMusic();
}

function doJumpOrRestart() {
  // 有任何菜单/暂停界面开着，就不要响应空格/点击
  if (overlaysVisible()) return;

  if (gameState === "playing") {
    if (player.isOnGround) {
      player.vy = JUMP_SPEED;
      player.isOnGround = false;
      playSound(jumpAudio);
      startBgMusic(); // 再保险一次，确保有点击手势后背景音乐能触发
    }
  } else if (gameState === "win" || gameState === "gameover") {
    startGame();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    doJumpOrRestart();
  }
});

canvas.addEventListener("mousedown", () => {
  doJumpOrRestart();
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  doJumpOrRestart();
});

// 初始化：默认普通难度 + 显示主菜单 & 启动动画循环
applyDifficultyConfig();
showMenu();
requestAnimationFrame(gameLoop);
