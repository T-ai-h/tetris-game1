const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 30;

let score = 0;
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");

const gameOverlay = document.getElementById("gameOverlay");
const restartBtn = document.getElementById("restartBtn");

const colors = [
  null,
  "#00f0f0", // I
  "#0000f0", // J
  "#f0a000", // L
  "#f0f000", // O
  "#00f000", // S
  "#a000f0", // T
  "#f00000", // Z
];

const tetrominoes = [
  [],
  [[1, 1, 1, 1]],                // I
  [[2, 0, 0], [2, 2, 2]],        // J
  [[0, 0, 3], [3, 3, 3]],        // L
  [[4, 4], [4, 4]],              // O
  [[0, 5, 5], [5, 5, 0]],        // S
  [[0, 6, 0], [6, 6, 6]],        // T
  [[7, 7, 0], [0, 7, 7]],        // Z
];

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let currentPiece = null;
let currentX = 0;
let currentY = 0;
let nextPiece = null;

let dropSpeed = 700;
let gameInterval;
let level = 1;

// ประกาศปุ่ม UI ก่อนใช้
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const downBtn = document.getElementById("downBtn");
const rotateBtn = document.getElementById("rotateBtn");

function randomPiece() {
  const id = Math.floor(Math.random() * (tetrominoes.length - 1)) + 1;
  return { id: id, shape: tetrominoes[id] };
}

function drawBlock(x, y, colorId, size = BLOCK_SIZE, context = ctx) {
  context.fillStyle = colors[colorId];
  context.fillRect(x * size, y * size, size, size);
  context.strokeStyle = "#222";
  context.lineWidth = 2;
  context.strokeRect(x * size, y * size, size, size);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c]) {
        drawBlock(c, r, grid[r][c]);
      }
    }
  }
}

function drawPiece(piece, x, y, context = ctx, size = BLOCK_SIZE) {
  piece.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) drawBlock(x + dx, y + dy, piece.id, size, context);
    });
  });
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = nextPiece.shape;
  const offsetX = Math.floor((nextCanvas.width / NEXT_BLOCK_SIZE - shape[0].length) / 2);
  const offsetY = Math.floor((nextCanvas.height / NEXT_BLOCK_SIZE - shape.length) / 2);
  drawPiece(nextPiece, offsetX, offsetY, nextCtx, NEXT_BLOCK_SIZE);
}

function validMove(piece, x, y) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        let newX = x + c;
        let newY = y + r;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
        if (newY >= 0 && grid[newY][newX]) return false;
      }
    }
  }
  return true;
}

function lockPiece(piece, x, y) {
  piece.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val && y + r >= 0) {
        grid[y + r][x + c] = piece.id;
      }
    });
  });
}

function clearLines() {
  let lines = 0;
  outer: for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (!grid[r][c]) continue outer;
    }
    grid.splice(r, 1);
    grid.unshift(Array(COLS).fill(0));
    lines++;
    r++;
  }
  if (lines > 0) {
    score += lines * 10;
    scoreEl.textContent = score;
    updateSpeed();
  }
}

function rotate(piece) {
  const oldShape = piece.shape;
  const rows = oldShape.length;
  const cols = oldShape[0].length;

  let newShape = [];
  for (let x = 0; x < cols; x++) {
    newShape[x] = [];
    for (let y = rows - 1; y >= 0; y--) {
      newShape[x][rows - 1 - y] = oldShape[y][x];
    }
  }

  return newShape;
}

function resetPiece() {
  currentPiece = nextPiece || randomPiece();
  nextPiece = randomPiece();
  drawNextPiece();
  currentX = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
  currentY = -1;
  if (!validMove(currentPiece, currentX, currentY)) {
    gameOver();
  }
}

function gameOver() {
  gameOverlay.style.display = "flex";
  clearInterval(gameInterval);
}

restartBtn.addEventListener("click", () => {
  gameOverlay.style.display = "none";

  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  level = 1;
  scoreEl.textContent = score;
  levelEl.textContent = level;

  nextPiece = randomPiece();
  resetPiece();
  updateSpeed();
  draw();
});

let uiMoveInterval = null;

function startContinuousMove(direction) {
  if (gameOverlay.style.display === "flex") return;
  if (uiMoveInterval) return;

  handleMove(direction);
  uiMoveInterval = setInterval(() => {
    handleMove(direction);
  }, 150);
}

function stopContinuousMove() {
  if (uiMoveInterval) {
    clearInterval(uiMoveInterval);
    uiMoveInterval = null;
  }
}

// ปุ่มซ้าย-ขวา: กดคลิกทีละก้าว
leftBtn.addEventListener("click", () => handleMove("left"));
rightBtn.addEventListener("click", () => handleMove("right"));

// ปุ่มลง: กดค้างได้ (mousedown, mouseup, mouseleave)
downBtn.addEventListener("mousedown", () => startContinuousMove("down"));
downBtn.addEventListener("mouseup", stopContinuousMove);
downBtn.addEventListener("mouseleave", stopContinuousMove);
downBtn.addEventListener("click", () => handleMove("down"));  // กดคลิกก็ยังเลื่อนลง 1 ช่อง

// ปุ่มหมุน: กดคลิกทีละรอบ
rotateBtn.addEventListener("click", () => handleMove("rotate"));



function update() {
  if (validMove(currentPiece, currentX, currentY + 1)) {
    currentY++;
  } else {
    lockPiece(currentPiece, currentX, currentY);
    clearLines();
    resetPiece();
  }
  draw();
}

function draw() {
  drawGrid();
  drawPiece(currentPiece, currentX, currentY);
}

function updateSpeed() {
  level = Math.floor(score / 50) + 1;
  levelEl.textContent = level;

  dropSpeed = Math.max(100, 700 - (level - 1) * 50);
  clearInterval(gameInterval);
  gameInterval = setInterval(update, dropSpeed);

  updateBackground();
}

function updateBackground() {
  const backgrounds = [
    "#ffffff", // Level 1: ขาว
    "#c8e6c9", // Level 2: เขียวอ่อน
    "#fff59d", // Level 3: เหลืองอ่อน
    "#ffccbc", // Level 4: ส้มอ่อน
    "#f8bbd0", // Level 5: ชมพูอ่อน
    "#d1c4e9", // Level 6: ม่วงอ่อน
    "#b3e5fc", // Level 7+: ฟ้าเข้มขึ้น
  ];

  let bgColor = backgrounds[Math.min(level - 1, backgrounds.length - 1)];
  canvas.style.background = bgColor;
}

function handleMove(direction) {
  if (gameOverlay.style.display === "flex") return;

  if (direction === "left") {
    if (validMove(currentPiece, currentX - 1, currentY)) currentX--;
  } else if (direction === "right") {
    if (validMove(currentPiece, currentX + 1, currentY)) currentX++;
  } else if (direction === "down") {
    update();  // เลื่อนชิ้นส่วนลงและจัดการล็อกชิ้นส่วนอัตโนมัติ
    return;     // ออกจากฟังก์ชันเลยเพื่อไม่ให้ draw() ซ้ำ
  } else if (direction === "rotate") {
    const rotatedShape = rotate(currentPiece);
    const testPiece = { ...currentPiece, shape: rotatedShape };

    if (validMove(testPiece, currentX, currentY)) {
      currentPiece.shape = rotatedShape;
    } else if (validMove(testPiece, currentX - 1, currentY)) {
      currentX--;
      currentPiece.shape = rotatedShape;
    } else if (validMove(testPiece, currentX + 1, currentY)) {
      currentX++;
      currentPiece.shape = rotatedShape;
    }
  }
  draw();
}

// เริ่มเกม
nextPiece = randomPiece();
resetPiece();
updateSpeed();
draw();
